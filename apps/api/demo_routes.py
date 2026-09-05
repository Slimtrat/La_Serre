from __future__ import annotations

import hashlib
import json
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field

from apps.api.demo_pipeline import MEDIA_TYPES, DemoPipeline, DemoStage
from apps.api.notifications import StudioNotificationLog
from engine.config import Settings
from engine.narrative.ollama import OllamaClient, OllamaModel

RECOMMENDED_NARRATIVE_MODEL = "qwen3:4b"
_NON_NARRATIVE_MODEL_MARKERS = ("coder", "embedding", "embed")


class DemoImagineRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    instruction: str = Field(default="", max_length=2_000)
    locale: Literal["fr", "en"] = "fr"
    engine: Literal["ai", "preview"] = "preview"


class DemoDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    feedback: str = Field(default="", max_length=500)
    locale: Literal["fr", "en"] = "fr"


class DemoStoryProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    story: str = Field(min_length=40, max_length=1_600)


class DemoBeatProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=80)
    action: str = Field(min_length=10, max_length=300)
    dialogue: str = Field(min_length=2, max_length=180)
    duration: float = Field(default=1.8, ge=1.2, le=2.4)


class DemoPlanProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    beats: list[DemoBeatProposal] = Field(min_length=3, max_length=3)


def create_demo_router(
    output_provider: Callable[[], Path],
    notifications_provider: Callable[[], StudioNotificationLog],
    settings_provider: Callable[[], Settings],
) -> APIRouter:
    router = APIRouter(prefix="/api/demo", tags=["demo"])
    pipeline = DemoPipeline(output_provider)

    @router.get("")
    def listing(locale: Literal["fr", "en"] = "fr") -> dict[str, object]:
        return pipeline.listing(locale=locale)

    @router.get("/capabilities")
    async def capabilities() -> dict[str, object]:
        settings = settings_provider()
        reachable = True
        try:
            async with OllamaClient(str(settings.ollama_url)) as client:
                models = await client.list_models()
        except (httpx.HTTPError, ValueError):
            reachable = False
            models = []
        names = [item.name for item in models]
        selected = _select_demo_model(models, settings.ollama_model)
        reason = None
        if not reachable:
            reason = "ollama_offline"
        elif not selected:
            reason = "narrative_model_missing"
        return {
            "ollama": {
                "reachable": reachable,
                "ready": bool(selected),
                "selected_model": selected,
                "models": names,
                "reason": reason,
                "recommended_model": RECOMMENDED_NARRATIVE_MODEL,
            },
            "stages": {
                "story": {"engine": "ollama", "real_ai": True, "ready": bool(selected)},
                "plan": {"engine": "ollama", "real_ai": True, "ready": bool(selected)},
                "frames": {"engine": "studio-renderer", "real_ai": False, "ready": True},
                "sound": {"engine": "studio-synth", "real_ai": False, "ready": True},
                "video": {"engine": "ffmpeg", "real_ai": False, "ready": True},
            },
        }

    @router.post("/recommended-model/install")
    async def install_recommended_model() -> dict[str, object]:
        settings = settings_provider()
        try:
            async with OllamaClient(str(settings.ollama_url), timeout_seconds=300) as client:
                await client.pull_model(RECOMMENDED_NARRATIVE_MODEL)
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail="Ollama est inaccessible.") from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail="Ollama n’a pas pu installer le modèle narratif.",
            ) from exc
        notifications_provider().publish(
            "info",
            "Modèle narratif installé",
            f"{RECOMMENDED_NARRATIVE_MODEL} est prêt dans Ollama.",
            source="demo",
        )
        return await capabilities()

    @router.post("/reset")
    def reset(payload: DemoDecisionRequest) -> dict[str, object]:
        result = pipeline.reset(locale=payload.locale)
        notifications_provider().publish(
            "info",
            "Démo express réinitialisée",
            "Le parcours 0 GPU est prêt à recommencer.",
            source="demo",
        )
        return result

    @router.post("/{stage}/imagine")
    async def imagine(stage: DemoStage, payload: DemoImagineRequest) -> dict[str, object]:
        try:
            if payload.engine == "ai":
                if stage not in {"story", "plan"}:
                    raise ValueError(
                        "Cette étape utilise l’aperçu local. Ouvre le graphe de "
                        "production pour une génération ComfyUI réelle."
                    )
                current_state = pipeline.listing(locale=payload.locale)
                _assert_stage_available(stage, current_state)
                content, provenance = await _ollama_proposal(
                    stage,
                    current_state,
                    payload,
                    settings_provider(),
                )
                result = pipeline.imagine(
                    stage,
                    instruction=payload.instruction,
                    locale=payload.locale,
                    generated_content=content,
                    provenance=provenance,
                )
            else:
                result = pipeline.imagine(
                    stage,
                    instruction=payload.instruction,
                    locale=payload.locale,
                )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Ollama est inaccessible. Prépare le Studio ou choisis "
                    "l’aperçu local explicite."
                ),
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail="Ollama a refusé la génération.") from exc
        except (OSError, RuntimeError, ValueError) as exc:
            notifications_provider().publish(
                "error",
                "Démo express interrompue",
                str(exc),
                source="demo",
                context={"stage": stage},
            )
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        notifications_provider().publish(
            "success",
            "Proposition de démo prête",
            f"{stage} attend maintenant ta validation.",
            source="demo",
            context={"stage": stage},
        )
        return result

    @router.post("/{stage}/approve")
    def approve(stage: DemoStage, payload: DemoDecisionRequest) -> dict[str, object]:
        try:
            result = pipeline.approve(stage, locale=payload.locale)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        notifications_provider().publish(
            "success",
            "Maillon validé",
            f"{stage} est approuvé ; la chaîne peut continuer.",
            source="demo",
            context={"stage": stage},
        )
        return result

    @router.post("/{stage}/reject")
    def reject(stage: DemoStage, payload: DemoDecisionRequest) -> dict[str, object]:
        try:
            result = pipeline.reject(
                stage,
                feedback=payload.feedback,
                locale=payload.locale,
            )
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        notifications_provider().publish(
            "warning",
            "Proposition refusée",
            f"{stage} peut être réimaginé ; ses dépendances ont été invalidées.",
            source="demo",
            context={"stage": stage},
        )
        return result

    @router.get("/media/{filename}")
    def media(filename: str) -> FileResponse:
        try:
            path = pipeline.media_path(filename)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Demo media not found") from exc
        if not path.is_file():
            raise HTTPException(status_code=404, detail="Demo media not found")
        return FileResponse(path, media_type=MEDIA_TYPES[filename], filename=filename)

    return router


async def _ollama_proposal(
    stage: DemoStage,
    state: dict[str, object],
    payload: DemoImagineRequest,
    settings: Settings,
) -> tuple[object, dict[str, object]]:
    async with OllamaClient(str(settings.ollama_url), timeout_seconds=120) as client:
        models = await client.list_models()
        model = _select_demo_model(models, settings.ollama_model)
        if not model:
            raise ValueError(
                f"Aucun modèle narratif Ollama adapté. Installe {RECOMMENDED_NARRATIVE_MODEL}."
            )
        if stage == "story":
            seed = payload.instruction.strip() or (
                "Belladonna steals a forbidden seed from Aconite at midnight"
                if payload.locale == "en"
                else "Belladone vole une graine interdite à Aconit, à minuit"
            )
            raw = await client.chat_structured(
                model,
                [
                    {
                        "role": "system",
                        "content": (
                            "You are writing a playful gothic dark-romance micro-scene. "
                            "Belladonna and Aconite are two adult women witches; never turn "
                            "them into men, literal plants, or abstract symbols. Write only "
                            "two to four cinematic sentences (55-100 words): one visible "
                            "action, one clear cause and consequence, and one short seductive "
                            "but threatening quote. Preserve the user's premise and names. "
                            "No meta-fiction, lore dump, explanation, gore, or new character."
                            if payload.locale == "en"
                            else "Tu écris une micro-scène de dark romance gothique et joueuse. "
                            "Belladone et Aconit sont deux sorcières adultes; ne les transforme "
                            "jamais en hommes, plantes littérales ou symboles abstraits. Écris "
                            "uniquement deux à quatre phrases cinématographiques (55-100 mots) : "
                            "une action visible, une cause et sa conséquence, puis une courte "
                            "réplique séduisante mais menaçante. Respecte l’idée et les noms de "
                            "l’utilisateur. Aucune méta-fiction, exposition, violence graphique "
                            "ou nouveau personnage."
                        ),
                    },
                    {"role": "user", "content": seed},
                ],
                DemoStoryProposal.model_json_schema(),
            )
            content: object = DemoStoryProposal.model_validate_json(raw).story
        else:
            stages = state.get("stages")
            story = ""
            if isinstance(stages, list):
                for item in stages:
                    if isinstance(item, dict) and item.get("id") == "story":
                        story = str(item.get("content") or "")
                        break
            if not story:
                raise ValueError("Valide d’abord une histoire avant le découpage IA.")
            raw = await client.chat_structured(
                model,
                [
                    {
                        "role": "system",
                        "content": (
                            "Continue the supplied story with exactly three chronological "
                            "cinematic beats for a five-second gothic dark-romance video. "
                            "Belladonna and Aconite remain adult women witches. Every beat must "
                            "show a different visible action and a speaker-labelled line under "
                            "twelve words. Keep one location, two characters, cause-and-effect, "
                            "and a final visual hook. Add nobody and explain nothing."
                            if payload.locale == "en"
                            else "Prolonge l’histoire fournie avec exactement trois temps "
                            "cinématographiques chronologiques pour une vidéo de dark romance "
                            "gothique de cinq secondes. Belladone et Aconit restent deux "
                            "sorcières adultes. Chaque temps montre une action visible différente "
                            "et une réplique attribuée de moins de douze mots. Garde un seul lieu, "
                            "deux personnages, une causalité claire et un crochet visuel final. "
                            "N’ajoute personne et n’explique rien."
                        ),
                    },
                    {"role": "user", "content": story},
                ],
                DemoPlanProposal.model_json_schema(),
            )
            proposal = DemoPlanProposal.model_validate_json(raw)
            content = [beat.model_dump(mode="json") for beat in proposal.beats]
    return content, {
        "provider": "ollama",
        "label": "Ollama · génération locale réelle",
        "model": model,
        "mode": "ai",
        "real_ai": True,
        "generated_at": datetime.now(UTC).isoformat(),
        "response_sha256": hashlib.sha256(raw.encode("utf-8")).hexdigest(),
        "contract": "demo-story-v1" if stage == "story" else "demo-plan-v1",
        "raw_json_valid": isinstance(json.loads(raw), dict),
    }


def _assert_stage_available(stage: DemoStage, state: dict[str, object]) -> None:
    stages = state.get("stages")
    current = (
        next(
            (item for item in stages if isinstance(item, dict) and item.get("id") == stage),
            None,
        )
        if isinstance(stages, list)
        else None
    )
    status = current.get("status") if current else None
    if status == "locked":
        raise ValueError("Valide l’étape précédente avant de lancer cette génération.")
    if status == "generating":
        raise ValueError("Cette étape est déjà en cours de génération.")


def _select_demo_model(models: list[OllamaModel], configured: str) -> str | None:
    names = [item.name for item in models]
    if configured and configured in names:
        return configured
    return next(
        (
            name
            for name in names
            if not any(marker in name.lower() for marker in _NON_NARRATIVE_MODEL_MARKERS)
        ),
        None,
    )
