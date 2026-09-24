"""Episode music endpoints shared by generation, import and final mix."""

from __future__ import annotations

import asyncio
import threading
from collections.abc import Callable
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from apps.api.run_history import RunHistory
from engine.audio.ace_step import AceStepClient, AceStepError
from engine.audio.music_assets import EpisodeMusicStore, MusicRecord
from engine.config import Settings
from engine.world.catalog import EpisodeCatalog

MAX_UPLOAD_BYTES = 100 * 1024 * 1024
EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}


class GenerateMusicRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    seed: int = Field(default=42, ge=0, le=2_147_483_647)
    force: bool = False


def create_episode_music_router(
    catalog_provider: Callable[[], EpisodeCatalog],
    settings_provider: Callable[[], Settings],
    client_factory: Callable[[str], AceStepClient] = AceStepClient,
) -> APIRouter:
    router = APIRouter(prefix="/api/episodes/{episode_id}/music", tags=["music"])
    lock = threading.Lock()

    def context(episode_id: str) -> tuple[Settings, EpisodeMusicStore, float]:
        try:
            episode = catalog_provider().get(episode_id)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Épisode introuvable") from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        settings = settings_provider()
        return settings, EpisodeMusicStore(settings.output_dir), episode.duration_target

    def response(episode_id: str, record: MusicRecord) -> dict[str, object]:
        return {
            "record": record.model_dump(mode="json"),
            "audio": f"/api/episode-media/{episode_id}/music.wav",
        }

    @router.get("")
    def inspect(episode_id: str) -> dict[str, object]:
        _, store, _ = context(episode_id)
        record = store.load(episode_id)
        return {
            "exists": store.track(episode_id).is_file(),
            "record": record.model_dump(mode="json") if record else None,
            "audio": f"/api/episode-media/{episode_id}/music.wav",
        }

    @router.post("/generate")
    async def generate(episode_id: str, payload: GenerateMusicRequest) -> dict[str, object]:
        settings, store, duration = context(episode_id)
        if store.track(episode_id).exists() and not payload.force:
            raise HTTPException(status_code=409, detail="Confirme le remplacement de la piste")
        if not lock.acquire(blocking=False):
            raise HTTPException(status_code=409, detail="Une piste est déjà en préparation")
        try:
            RunHistory(settings.output_dir).archive_master(episode_id)
            def work() -> MusicRecord:
                with client_factory(str(settings.ace_step_url)) as client:
                    return store.generate(
                        episode_id,
                        prompt=payload.prompt,
                        duration=max(10, duration),
                        seed=payload.seed,
                        client=client,
                        force=payload.force,
                    )

            record = await asyncio.to_thread(work)
            RunHistory(settings.output_dir).invalidate_master(episode_id, archive=False)
            return response(episode_id, record)
        except FileExistsError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except (AceStepError, OSError) as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        finally:
            lock.release()

    @router.post("/import")
    async def import_music(
        episode_id: str,
        request: Request,
        filename: str,
        license_id: str,
        rights_confirmed: bool = False,
        force: bool = False,
    ) -> dict[str, object]:
        settings, store, _ = context(episode_id)
        extension = Path(filename).suffix.lower()
        if extension not in EXTENSIONS:
            raise HTTPException(status_code=422, detail="Format audio non pris en charge")
        if not rights_confirmed or not license_id.strip():
            raise HTTPException(
                status_code=422,
                detail="Indique l'origine et confirme les droits commerciaux de la piste",
            )
        if store.track(episode_id).exists() and not force:
            raise HTTPException(status_code=409, detail="Confirme le remplacement de la piste")
        if not lock.acquire(blocking=False):
            raise HTTPException(status_code=409, detail="Une piste est déjà en préparation")
        temporary = store.track(episode_id).with_name(f"music-upload-{uuid4().hex}{extension}")
        try:
            temporary.parent.mkdir(parents=True, exist_ok=True)
            size = 0
            with temporary.open("xb") as output:
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > MAX_UPLOAD_BYTES:
                        raise HTTPException(status_code=413, detail="Fichier audio trop volumineux")
                    output.write(chunk)
            if size == 0:
                raise HTTPException(status_code=422, detail="Fichier audio vide")
            RunHistory(settings.output_dir).archive_master(episode_id)
            record = await asyncio.to_thread(
                store.import_track,
                episode_id,
                temporary,
                license_id=license_id,
                rights_confirmed=True,
                force=force,
            )
            RunHistory(settings.output_dir).invalidate_master(episode_id, archive=False)
            return response(episode_id, record)
        except FileExistsError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        finally:
            temporary.unlink(missing_ok=True)
            lock.release()

    return router
