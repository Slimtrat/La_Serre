from __future__ import annotations

from collections.abc import Callable
from dataclasses import asdict

import httpx
from fastapi import APIRouter, HTTPException

from apps.api.assets import AssetStore
from apps.api.schemas import ShotDraftRequest
from engine.config import Settings
from engine.narrative.ollama import OllamaClient, OllamaModel
from engine.narrative.shot_director import OllamaShotDirector
from engine.world.bible import BibleRegistry


def create_narrative_router(
    settings_provider: Callable[[], Settings],
    assets_provider: Callable[[], AssetStore],
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

    return router


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
