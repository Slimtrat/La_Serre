from __future__ import annotations

import asyncio
from collections.abc import Callable
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException

from engine.config import Settings
from engine.generation.comfy.client import ComfyClient
from engine.generation.comfy.model_installer import ModelInstaller
from engine.narrative.ollama import OllamaClient
from engine.runtime.capability_packs import (
    DEFAULT_CAPABILITY_PACK,
    CapabilityPackInspector,
    inspect_hardware,
)


def create_runtime_pack_router(
    settings_provider: Callable[[], Settings],
) -> APIRouter:
    router = APIRouter(prefix="/api/runtime-packs", tags=["runtime-packs"])

    @router.get("/{pack_id}")
    @router.get("/current")
    async def diagnose_pack(pack_id: str = DEFAULT_CAPABILITY_PACK.id) -> dict[str, object]:
        if pack_id != DEFAULT_CAPABILITY_PACK.id:
            raise HTTPException(status_code=404, detail="Pack de capacités introuvable")
        settings = await asyncio.to_thread(settings_provider)
        roots = _model_roots(settings)
        ollama_reachable, ollama_models = await _inspect_ollama(settings)
        comfyui_reachable, available_nodes = await _inspect_comfyui(settings)
        hardware = await asyncio.to_thread(inspect_hardware, roots[0])
        diagnosis = await asyncio.to_thread(
            CapabilityPackInspector().inspect,
            hardware=hardware,
            model_roots=roots,
            workflow_root=_workflow_root(settings),
            installed_ollama_models=ollama_models,
            ollama_reachable=ollama_reachable,
            comfyui_reachable=comfyui_reachable,
            available_nodes=available_nodes,
        )
        return diagnosis.model_dump(mode="json")

    return router


def _model_roots(settings: Settings) -> tuple[Path, ...]:
    detected = ModelInstaller.detect_model_roots()
    configured = settings.comfyui_models_dir
    if configured is None:
        return detected
    return tuple(dict.fromkeys((configured.resolve(), *detected)))


def _workflow_root(settings: Settings) -> Path:
    profiles = (
        settings.keyframe_workflow_profile,
        settings.keyframe_guide_workflow_profile,
        settings.video_workflow_profile,
    )
    configured = next((path for path in profiles if path is not None), None)
    return configured.parent if configured is not None else Path("workflows/local")


async def _inspect_ollama(settings: Settings) -> tuple[bool, set[str]]:
    try:
        async with OllamaClient(str(settings.ollama_url)) as client:
            models = await client.list_models()
    except (httpx.HTTPError, ValueError):
        return False, set()
    return True, {model.name for model in models}


async def _inspect_comfyui(settings: Settings) -> tuple[bool, set[str] | None]:
    try:
        async with ComfyClient(
            str(settings.comfyui_url),
            request_timeout_seconds=min(settings.comfyui_timeout_seconds, 5),
            poll_interval_seconds=settings.comfyui_poll_interval_seconds,
        ) as client:
            if not await client.is_ready():
                return False, None
            return True, set(await client.get_object_info())
    except (httpx.HTTPError, ValueError):
        return False, None
