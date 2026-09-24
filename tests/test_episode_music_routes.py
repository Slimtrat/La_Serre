from __future__ import annotations

import wave
from io import BytesIO
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI

from apps.api.episode_music_routes import create_episode_music_router
from engine.config import Settings
from engine.narrative.episode_models import Episode
from engine.world.catalog import EpisodeCatalog


def _wav() -> bytes:
    stream = BytesIO()
    with wave.open(stream, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(24_000)
        output.writeframes(b"\0\0" * 1_000)
    return stream.getvalue()


class FakeAceClient:
    def __init__(self, url: str) -> None:
        assert url == "http://127.0.0.1:8001/"

    def __enter__(self) -> FakeAceClient:
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def generate(
        self, *, prompt: str, duration: float, destination: Path, seed: int
    ) -> str:
        assert prompt == "Jazz feutré instrumental"
        assert duration == 12
        assert seed == 7
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(_wav())
        return "task-seven"


@pytest.mark.asyncio
async def test_music_generate_import_and_rights(tmp_path: Path) -> None:
    settings = Settings(
        output_dir=tmp_path / "output",
        private_content_dir=tmp_path / "private",
    )
    catalog = EpisodeCatalog(settings.private_content_dir)
    catalog.create(Episode(id="S01E001", season=1, episode=1, duration_target=12))
    app = FastAPI()
    app.include_router(
        create_episode_music_router(lambda: catalog, lambda: settings, FakeAceClient)  # type: ignore[arg-type]
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        path = "/api/episodes/S01E001/music"
        empty = await client.get(path)
        assert empty.json()["exists"] is False
        generated = await client.post(
            path + "/generate",
            json={"prompt": "Jazz feutré instrumental", "seed": 7},
        )
        assert generated.status_code == 200
        assert generated.json()["record"]["provider_task_id"] == "task-seven"
        conflict = await client.post(
            path + "/generate",
            json={"prompt": "Jazz feutré instrumental", "seed": 7},
        )
        assert conflict.status_code == 409
        denied = await client.post(
            path + "/import?filename=music.wav&license_id=Commande",
            content=_wav(),
        )
        assert denied.status_code == 422
        import_url = (
            path + "/import?filename=music.wav&license_id=Commande"
            "&rights_confirmed=true&force=true"
        )
        imported = await client.post(
            import_url,
            content=_wav(),
        )
        assert imported.status_code == 200
        assert imported.json()["record"]["source"] == "imported"
        persisted = await client.get(path)
        assert persisted.json()["record"]["license_id"] == "Commande"
