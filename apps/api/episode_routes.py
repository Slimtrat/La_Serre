from __future__ import annotations

import hashlib
import json
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from apps.api.project_explorer import build_project_explorer
from apps.api.schemas import (
    BreakdownApplyRequest,
    EpisodeCreateRequest,
    EpisodeDraftApplyRequest,
    EpisodePatchRequest,
    NarrativeGenerateRequest,
)
from engine.config import Settings
from engine.narrative.episode_models import (
    Episode,
    EpisodeStatus,
    NarrativeProvenance,
)
from engine.narrative.narrative_workflow import OllamaNarrativeAuthor, build_shots
from engine.narrative.ollama import OllamaClient
from engine.production.artifacts import write_text_atomic
from engine.world.bible import BibleRegistry
from engine.world.catalog import EpisodeCatalog
from engine.world.models import ProjectBible


def create_episode_router(
    catalog_provider: Callable[[], EpisodeCatalog],
    output_root_provider: Callable[[], Path],
    settings_provider: Callable[[], Settings],
) -> APIRouter:
    router = APIRouter(prefix="/api/episodes", tags=["episodes"])

    @router.get("")
    def list_episodes() -> dict[str, object]:
        try:
            episodes = catalog_provider().list_episodes()
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return {"episodes": [episode.model_dump(mode="json") for episode in episodes]}

    @router.get("/project-explorer")
    def project_explorer() -> dict[str, object]:
        try:
            return build_project_explorer(catalog_provider(), output_root_provider())
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    @router.get("/{episode_id}")
    def get_episode(episode_id: str) -> dict[str, object]:
        try:
            package = catalog_provider().load(episode_id)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=f"Episode not found: {episode_id}") from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return package.model_dump(mode="json")

    @router.post("", status_code=201)
    def create_episode(payload: EpisodeCreateRequest) -> dict[str, object]:
        catalog = catalog_provider()
        number = payload.episode or catalog.next_episode_number(payload.season)
        episode_id = f"S{payload.season:02d}E{number:03d}"
        episode = Episode(
            id=episode_id,
            season=payload.season,
            episode=number,
            title=payload.title,
            narrative_source=payload.concept,
            duration_target=payload.duration_target,
            status=EpisodeStatus.IDEA,
            provenance=[
                NarrativeProvenance(
                    stage="episode",
                    mode="manual",
                    source_label="Création dans le Studio",
                )
            ],
        )
        try:
            created = catalog.create(episode)
        except FileExistsError as exc:
            raise HTTPException(
                status_code=409, detail=f"L’épisode {episode_id} existe déjà"
            ) from exc
        return created.model_dump(mode="json")

    @router.put("/{episode_id}")
    def update_episode(episode_id: str, payload: EpisodePatchRequest) -> dict[str, object]:
        catalog = catalog_provider()
        try:
            episode = catalog.get(episode_id)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=f"Episode not found: {episode_id}") from exc
        updates = payload.model_dump(exclude_none=True)
        requested_status = updates.get("status")
        if requested_status in {
            EpisodeStatus.APPROVED,
            EpisodeStatus.BREAKDOWN,
            EpisodeStatus.PRODUCTION,
            EpisodeStatus.FINAL,
        }:
            raise HTTPException(
                status_code=409, detail="Utilise les gates de validation pour changer cet état"
            )
        narrative_fields = {
            "title",
            "logline",
            "story",
            "narrative_source",
            "characters",
            "locations",
        }
        if narrative_fields.intersection(updates) and "status" not in updates:
            updates["status"] = EpisodeStatus.WRITING
        updates["provenance"] = [
            *episode.provenance,
            NarrativeProvenance(stage="episode", mode="manual", source_label="Édition Studio"),
        ]
        try:
            saved = catalog.save(
                Episode.model_validate({**episode.model_dump(mode="python"), **updates})
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return saved.model_dump(mode="json")

    @router.delete("/{episode_id}")
    def delete_episode(episode_id: str) -> dict[str, object]:
        try:
            destination = catalog_provider().delete(episode_id)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail=f"Episode not found: {episode_id}") from exc
        return {"status": "trashed", "episode_id": episode_id, "recoverable_from": str(destination)}

    @router.post("/{episode_id}/draft/generate")
    async def generate_episode_draft(
        episode_id: str,
        payload: NarrativeGenerateRequest,
    ) -> dict[str, object]:
        episode = _episode_or_404(catalog_provider(), episode_id)
        if payload.source_text.strip():
            episode = episode.model_copy(update={"narrative_source": payload.source_text.strip()})
        candidate, model = await _episode_candidate(
            settings_provider,
            payload,
            lambda author, bible, selected: author.episode_draft(
                episode,
                bible=bible,
                model=selected,
                custom_prompt=payload.prompt,
            ),
        )
        return {"candidate": candidate.model_dump(mode="json"), "model": model, "canonical": False}

    @router.post("/{episode_id}/draft/apply")
    def apply_episode_draft(
        episode_id: str,
        payload: EpisodeDraftApplyRequest,
    ) -> dict[str, object]:
        catalog = catalog_provider()
        episode = _episode_or_404(catalog, episode_id)
        bible = BibleRegistry(catalog.root).load()
        character_ids = {item.id for item in bible.characters}
        location_ids = {item.id for item in bible.locations}
        unknown = (set(payload.candidate.character_ids) - character_ids) | (
            set(payload.candidate.location_ids) - location_ids
        )
        if unknown:
            raise HTTPException(
                status_code=422,
                detail="Références absentes de la Bible : " + ", ".join(sorted(unknown)),
            )
        provenance = _episode_provenance("episode", payload)
        saved = catalog.save(
            episode.model_copy(
                update={
                    "title": payload.candidate.title,
                    "logline": payload.candidate.logline,
                    "story": payload.candidate.story,
                    "narrative_source": payload.candidate.narrative_source,
                    "characters": payload.candidate.character_ids,
                    "locations": payload.candidate.location_ids,
                    "status": EpisodeStatus.REVIEW,
                    "provenance": [*episode.provenance, provenance],
                }
            )
        )
        return saved.model_dump(mode="json")

    @router.post("/{episode_id}/review")
    def review_episode(episode_id: str) -> dict[str, object]:
        catalog = catalog_provider()
        episode = _episode_or_404(catalog, episode_id)
        report = _episode_review(episode, BibleRegistry(catalog.root).load())
        write_text_atomic(
            catalog.episode_dir(episode_id) / "episode-review.json",
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        )
        return report

    @router.post("/{episode_id}/approve")
    def approve_episode(episode_id: str) -> dict[str, object]:
        catalog = catalog_provider()
        episode = _episode_or_404(catalog, episode_id)
        review_path = catalog.episode_dir(episode_id) / "episode-review.json"
        if not review_path.is_file():
            raise HTTPException(status_code=409, detail="Lance la validation avant d’approuver")
        report = json.loads(review_path.read_text(encoding="utf-8"))
        if report.get("fingerprint") != _episode_fingerprint(episode):
            raise HTTPException(status_code=409, detail="Le texte a changé : relance la validation")
        if report.get("status") == "fail":
            raise HTTPException(status_code=409, detail="Corrige les blocages avant d’approuver")
        saved = catalog.save(episode.model_copy(update={"status": EpisodeStatus.APPROVED}))
        return saved.model_dump(mode="json")

    @router.post("/{episode_id}/breakdown/generate")
    async def generate_episode_breakdown(
        episode_id: str,
        payload: NarrativeGenerateRequest,
    ) -> dict[str, object]:
        episode = _episode_or_404(catalog_provider(), episode_id)
        if episode.status is not EpisodeStatus.APPROVED:
            raise HTTPException(status_code=409, detail="Approuve l’épisode avant son découpage")
        candidate, model = await _episode_candidate(
            settings_provider,
            payload,
            lambda author, bible, selected: author.breakdown(
                episode,
                bible=bible,
                model=selected,
                custom_prompt=payload.prompt,
            ),
        )
        return {"candidate": candidate.model_dump(mode="json"), "model": model, "canonical": False}

    @router.post("/{episode_id}/breakdown/apply")
    def apply_episode_breakdown(
        episode_id: str,
        payload: BreakdownApplyRequest,
    ) -> dict[str, object]:
        catalog = catalog_provider()
        episode = _episode_or_404(catalog, episode_id)
        if episode.status is not EpisodeStatus.APPROVED:
            raise HTTPException(status_code=409, detail="Approuve l’épisode avant son découpage")
        try:
            updated, shots = build_shots(
                episode,
                payload.candidate,
                BibleRegistry(catalog.root).load(),
            )
            updated = updated.model_copy(
                update={
                    "provenance": [
                        *updated.provenance,
                        _episode_provenance("breakdown", payload),
                    ]
                }
            )
            package = catalog.save_breakdown(updated, shots)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return package.model_dump(mode="json")

    return router


def _episode_or_404(catalog: EpisodeCatalog, episode_id: str) -> Episode:
    try:
        return catalog.get(episode_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"Episode not found: {episode_id}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _episode_provenance(stage: str, payload: object) -> NarrativeProvenance:
    mode = str(getattr(payload, "mode", "manual"))
    return NarrativeProvenance(
        stage=stage,
        mode=mode,
        provider="ollama" if mode == "ai" else "human",
        model=getattr(payload, "model", None),
        prompt=str(getattr(payload, "prompt", "")),
        source_label=str(getattr(payload, "source_label", "")),
    )


def _episode_fingerprint(episode: Episode) -> str:
    payload = episode.model_dump(mode="json", exclude={"status", "provenance"})
    return hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str).encode()
    ).hexdigest()


def _episode_review(episode: Episode, bible: ProjectBible) -> dict[str, object]:
    character_ids = {item.id for item in bible.characters}
    location_ids = {item.id for item in bible.locations}
    findings: list[dict[str, str]] = []
    checks = [
        (
            len(episode.logline.strip()) >= 10,
            "blocker",
            "Logline trop courte",
            "Écris une promesse narrative claire.",
        ),
        (
            len(episode.narrative_source.strip()) >= 20,
            "blocker",
            "Histoire trop courte",
            "Développe le récit avant validation.",
        ),
        (
            bool(episode.story.hook.strip()),
            "warning",
            "Accroche absente",
            "Ajoute un hook identifiable.",
        ),
        (
            bool(episode.story.cliffhanger.strip()),
            "warning",
            "Cliffhanger absent",
            "Ajoute une sortie qui appelle la suite.",
        ),
    ]
    for passed, severity, title, recommendation in checks:
        if not passed:
            findings.append(
                {"severity": severity, "title": title, "recommendation": recommendation}
            )
    for unknown in sorted(set(episode.characters) - character_ids):
        findings.append(
            {
                "severity": "blocker",
                "title": f"Personnage inconnu : {unknown}",
                "recommendation": "Choisis un personnage de la Bible.",
            }
        )
    for unknown in sorted(set(episode.locations) - location_ids):
        findings.append(
            {
                "severity": "blocker",
                "title": f"Lieu inconnu : {unknown}",
                "recommendation": "Choisis un lieu de la Bible.",
            }
        )
    status = (
        "fail"
        if any(item["severity"] == "blocker" for item in findings)
        else ("warning" if findings else "pass")
    )
    return {
        "episode_id": episode.id,
        "created_at": datetime.now(UTC).isoformat(),
        "fingerprint": _episode_fingerprint(episode),
        "status": status,
        "can_approve": status != "fail",
        "findings": findings,
    }


async def _episode_candidate[CandidateT: BaseModel](
    settings_provider: Callable[[], Settings],
    payload: NarrativeGenerateRequest,
    action: Callable[
        [OllamaNarrativeAuthor, ProjectBible, str],
        Awaitable[CandidateT],
    ],
) -> tuple[CandidateT, str]:
    settings = settings_provider()
    try:
        async with OllamaClient(str(settings.ollama_url)) as client:
            models = await client.list_models()
            names = {item.name for item in models}
            selected = payload.model or (
                settings.ollama_model if settings.ollama_model in names else None
            )
            selected = selected or (models[0].name if models else None)
            if not selected or selected not in names:
                raise ValueError("Sélectionne un modèle Ollama installé")
            candidate = await action(
                OllamaNarrativeAuthor(client),
                BibleRegistry(settings.private_content_dir).load(),
                selected,
            )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502, detail=f"Ollama a refusé la génération : {exc.response.status_code}"
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail="Ollama est inaccessible") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return candidate, selected
