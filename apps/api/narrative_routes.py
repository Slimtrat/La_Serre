from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import asdict

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from apps.api.assets import AssetStore
from apps.api.schemas import (
    DirectorSaveRequest,
    NarrativeApprovalRequest,
    NarrativeGenerateRequest,
    ScreenwriterSaveRequest,
    ShotDraftRequest,
    ValidatorSaveRequest,
)
from engine.config import Settings
from engine.narrative.episode_models import NarrativeProvenance
from engine.narrative.narrative_workflow import (
    NarrativeWorkflowRegistry,
    OllamaNarrativeAuthor,
)
from engine.narrative.ollama import OllamaClient, OllamaModel
from engine.narrative.shot_director import OllamaShotDirector
from engine.world.bible import BibleRegistry
from engine.world.catalog import EpisodeCatalog
from engine.world.models import ProjectBible


def create_narrative_router(
    settings_provider: Callable[[], Settings],
    assets_provider: Callable[[], AssetStore],
    catalog_provider: Callable[[], EpisodeCatalog],
) -> APIRouter:
    router = APIRouter(prefix="/api/narrative", tags=["narrative"])

    @router.get("/status")
    async def status() -> dict[str, object]:
        settings = settings_provider()
        try:
            async with OllamaClient(str(settings.ollama_url)) as client:
                models = await client.list_models()
        except (httpx.HTTPError, ValueError):
            return {"ready": False, "models": [], "selected_model": None}
        selected = _select_model(models, settings.ollama_model)
        return {
            "ready": True,
            "models": [_model_payload(model) for model in models],
            "selected_model": selected,
        }

    @router.post("/shot")
    async def draft_shot(payload: ShotDraftRequest) -> dict[str, object]:
        settings = settings_provider()
        try:
            async with OllamaClient(str(settings.ollama_url)) as client:
                models = await client.list_models()
                model = payload.model or _select_model(models, settings.ollama_model)
                if not model or model not in {item.name for item in models}:
                    raise ValueError("Sélectionne un modèle Ollama installé")
                result = await OllamaShotDirector(client).draft(
                    payload.source_text,
                    shot_id=payload.shot_id,
                    duration=payload.duration,
                    model=model,
                )
                resolved_shot = BibleRegistry(settings.private_content_dir).resolve_shot(
                    result.shot,
                    strict=False,
                )
        except httpx.HTTPStatusError as exc:
            detail = _ollama_error(exc.response)
            raise HTTPException(status_code=502, detail=detail) from exc
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail="Ollama est inaccessible") from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        content = resolved_shot.model_dump_json(indent=2).encode("utf-8")
        record = assets_provider().put_model(
            resolved_shot.id,
            "shot",
            "shot.json",
            "application/json",
            content,
            provider="ollama",
            model=result.model,
        )
        return {
            "shot": resolved_shot.model_dump(mode="json"),
            "model": result.model,
            "attempts": result.attempts,
            "artifact": asdict(record),
        }

    @router.get("/series")
    def get_series_workflow() -> dict[str, object]:
        return _registry(settings_provider).load().model_dump(mode="json")

    @router.post("/series/director/generate")
    async def generate_director(payload: NarrativeGenerateRequest) -> dict[str, object]:
        if len(payload.source_text.strip()) < 10:
            raise HTTPException(
                status_code=422, detail="Décris l’intention de série en au moins 10 caractères"
            )
        candidate, model = await _author_candidate(
            settings_provider,
            payload,
            lambda author, bible, selected: author.director(
                payload.source_text,
                bible=bible,
                model=selected,
                custom_prompt=payload.prompt,
            ),
        )
        return {"candidate": candidate.model_dump(mode="json"), "model": model, "canonical": False}

    @router.put("/series/director")
    def save_director(payload: DirectorSaveRequest) -> dict[str, object]:
        workflow = _registry(settings_provider).put_director(
            payload.content,
            _provenance("director", payload),
        )
        return workflow.model_dump(mode="json")

    @router.post("/series/director/approve")
    def approve_director(payload: NarrativeApprovalRequest) -> dict[str, object]:
        return _approve(settings_provider, "director", payload)

    @router.post("/series/screenwriter/generate")
    async def generate_screenwriter(payload: NarrativeGenerateRequest) -> dict[str, object]:
        workflow = _registry(settings_provider).load()
        director_content = workflow.director.content
        if workflow.director.status.value != "approved" or director_content is None:
            raise HTTPException(status_code=409, detail="Valide d’abord la direction de série")
        candidate, model = await _author_candidate(
            settings_provider,
            payload,
            lambda author, bible, selected: author.screenwriter(
                director_content,
                bible=bible,
                model=selected,
                custom_prompt=payload.prompt,
            ),
        )
        return {"candidate": candidate.model_dump(mode="json"), "model": model, "canonical": False}

    @router.put("/series/screenwriter")
    def save_screenwriter(payload: ScreenwriterSaveRequest) -> dict[str, object]:
        try:
            workflow = _registry(settings_provider).put_screenwriter(
                payload.content,
                _provenance("screenwriter", payload),
            )
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return workflow.model_dump(mode="json")

    @router.post("/series/screenwriter/approve")
    def approve_screenwriter(payload: NarrativeApprovalRequest) -> dict[str, object]:
        return _approve(settings_provider, "screenwriter", payload)

    @router.post("/series/validator/generate")
    async def generate_validator(payload: NarrativeGenerateRequest) -> dict[str, object]:
        workflow = _registry(settings_provider).load()
        director_content = workflow.director.content
        screenwriter_content = workflow.screenwriter.content
        if (
            director_content is None
            or workflow.screenwriter.status.value != "approved"
            or screenwriter_content is None
        ):
            raise HTTPException(status_code=409, detail="Valide d’abord le travail du scénariste")
        candidate, model = await _author_candidate(
            settings_provider,
            payload,
            lambda author, bible, selected: author.validate_series(
                director_content,
                screenwriter_content,
                bible=bible,
                model=selected,
                custom_prompt=payload.prompt,
            ),
        )
        return {"candidate": candidate.model_dump(mode="json"), "model": model, "canonical": False}

    @router.put("/series/validator")
    def save_validator(payload: ValidatorSaveRequest) -> dict[str, object]:
        try:
            workflow = _registry(settings_provider).put_validator(
                payload.content,
                _provenance("validator", payload),
            )
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return workflow.model_dump(mode="json")

    @router.post("/series/validator/approve")
    def approve_validator(payload: NarrativeApprovalRequest) -> dict[str, object]:
        return _approve(settings_provider, "validator", payload)

    @router.post("/series/publish")
    def publish_series_episodes() -> dict[str, object]:
        try:
            workflow, created = _registry(settings_provider).publish(catalog_provider())
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return {
            "workflow": workflow.model_dump(mode="json"),
            "created_episode_ids": created,
        }

    return router


def _registry(settings_provider: Callable[[], Settings]) -> NarrativeWorkflowRegistry:
    return NarrativeWorkflowRegistry(settings_provider().private_content_dir)


def _provenance(stage: str, payload: object) -> NarrativeProvenance:
    mode = str(getattr(payload, "mode", "manual"))
    return NarrativeProvenance(
        stage=stage,
        mode=mode,
        provider="ollama" if mode == "ai" else "human",
        model=getattr(payload, "model", None),
        prompt=str(getattr(payload, "prompt", "")),
        source_label=str(getattr(payload, "source_label", "")),
    )


def _approve(
    settings_provider: Callable[[], Settings],
    stage: str,
    payload: NarrativeApprovalRequest,
) -> dict[str, object]:
    try:
        workflow = _registry(settings_provider).approve(
            stage,
            override_reason=payload.override_reason,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return workflow.model_dump(mode="json")


async def _author_candidate[CandidateT: BaseModel](
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
            selected = payload.model or _select_model(models, settings.ollama_model)
            if not selected or selected not in {item.name for item in models}:
                raise ValueError("Sélectionne un modèle Ollama installé")
            candidate = await action(
                OllamaNarrativeAuthor(client),
                BibleRegistry(settings.private_content_dir).load(),
                selected,
            )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=_ollama_error(exc.response)) from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail="Ollama est inaccessible") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return candidate, selected


def _select_model(models: list[OllamaModel], configured: str) -> str | None:
    names = {model.name for model in models}
    if configured and configured in names:
        return configured
    return models[0].name if models else None


def _model_payload(model: OllamaModel) -> dict[str, object]:
    return {
        "name": model.name,
        "size": model.size,
        "parameter_size": model.details.get("parameter_size"),
        "quantization": model.details.get("quantization_level"),
    }


def _ollama_error(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    message = payload.get("error") if isinstance(payload, dict) else None
    return f"Ollama a refusé la génération : {message or response.status_code}"
