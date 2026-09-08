from __future__ import annotations

import asyncio
from collections.abc import Callable
from pathlib import Path
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from engine.config import Settings
from engine.generation.comfy.client import ComfyClient
from engine.generation.comfy.model_installer import ModelInstaller
from engine.narrative.ollama import OllamaClient
from engine.runtime.capability_packs import (
    DEFAULT_CAPABILITY_PACK,
    CapabilityPackInspector,
    inspect_hardware,
)
from engine.runtime.installers import (
    ComfyCliAdapter,
    DirectDownloadAdapter,
    HttpxDownloader,
    InstallContext,
    OllamaInstallerAdapter,
    SafeProcessRunner,
)
from engine.runtime.pack_job import PackPreparationManager


class PackStartRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: Literal["automatic", "manual"] = "automatic"
    accepted_license_ids: list[str] = Field(default_factory=list, max_length=100)
    use_personal_comfy_models: bool = False


class PackRepairRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    accepted_license_ids: list[str] = Field(default_factory=list, max_length=100)


def create_runtime_pack_router(
    settings_provider: Callable[[], Settings],
    *,
    manager_factory: Callable[[bool], PackPreparationManager] | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/api/runtime-packs", tags=["runtime-packs"])
    managers: dict[bool, PackPreparationManager] = {}

    def manager(personal: bool = False) -> PackPreparationManager:
        existing = managers.get(personal)
        if existing:
            return existing
        if manager_factory:
            created = manager_factory(personal)
        else:
            settings = settings_provider()
            managed_root = (settings.output_dir.resolve().parent / ".la-serre-runtime").resolve()
            if personal:
                if settings.comfyui_models_dir is None:
                    raise ValueError("Aucun dossier ComfyUI personnel n’est configuré")
                models_root = settings.comfyui_models_dir.resolve()
            else:
                models_root = managed_root / "comfyui" / "ComfyUI" / "models"
            runner = SafeProcessRunner()
            created = PackPreparationManager(
                state_root=settings.output_dir
                / ".studio"
                / ("runtime-pack-jobs-personal" if personal else "runtime-pack-jobs"),
                context=InstallContext(
                    managed_root=managed_root,
                    comfy_workspace=managed_root / "comfyui",
                    models_root=models_root,
                    workflow_root=_workflow_root(settings),
                ),
                adapters=(
                    OllamaInstallerAdapter(runner),
                    ComfyCliAdapter(runner),
                    DirectDownloadAdapter(HttpxDownloader()),
                ),
                process_runner=runner,
            )
        managers[personal] = created
        return created

    def find_manager(job_id: str) -> PackPreparationManager:
        for personal in (False, True):
            try:
                candidate = manager(personal)
                candidate.get(job_id)
                return candidate
            except (KeyError, ValueError):
                continue
        raise HTTPException(status_code=404, detail="Préparation du pack introuvable")

    @router.post("/{pack_id}/jobs", status_code=202)
    async def start_job(pack_id: str, payload: PackStartRequest) -> dict[str, object]:
        _assert_pack(pack_id)
        try:
            job = manager(payload.use_personal_comfy_models).start(
                mode=payload.mode,
                accepted_license_ids=set(payload.accepted_license_ids),
            )
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return {"job": job.model_dump(mode="json")}

    @router.get("/jobs/latest")
    async def latest_job(
        use_personal_comfy_models: bool = Query(default=False),
    ) -> dict[str, object]:
        try:
            job = manager(use_personal_comfy_models).latest()
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return {"job": job.model_dump(mode="json") if job else None}

    @router.get("/jobs/{job_id}")
    async def get_job(job_id: str) -> dict[str, object]:
        job = find_manager(job_id).get(job_id)
        return {"job": job.model_dump(mode="json")}

    @router.get("/jobs/{job_id}/logs")
    async def get_logs(job_id: str) -> dict[str, object]:
        return {"logs": find_manager(job_id).logs(job_id)}

    @router.post("/jobs/{job_id}/pause")
    async def pause_job(job_id: str) -> dict[str, object]:
        try:
            job = find_manager(job_id).pause(job_id)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return {"job": job.model_dump(mode="json")}

    @router.post("/jobs/{job_id}/resume", status_code=202)
    async def resume_job(job_id: str, payload: PackRepairRequest) -> dict[str, object]:
        try:
            job = find_manager(job_id).resume(
                job_id, accepted_license_ids=set(payload.accepted_license_ids)
            )
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return {"job": job.model_dump(mode="json")}

    @router.post("/jobs/{job_id}/repair", status_code=202)
    async def repair_job(job_id: str, payload: PackRepairRequest) -> dict[str, object]:
        try:
            job = find_manager(job_id).repair(
                job_id, accepted_license_ids=set(payload.accepted_license_ids)
            )
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return {"job": job.model_dump(mode="json")}

    @router.post("/jobs/{job_id}/cancel")
    async def cancel_job(job_id: str) -> dict[str, object]:
        try:
            job = find_manager(job_id).cancel(job_id)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return {"job": job.model_dump(mode="json")}

    @router.get("/{pack_id}")
    @router.get("/current")
    async def diagnose_pack(pack_id: str = DEFAULT_CAPABILITY_PACK.id) -> dict[str, object]:
        _assert_pack(pack_id)
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


def _assert_pack(pack_id: str) -> None:
    if pack_id != DEFAULT_CAPABILITY_PACK.id:
        raise HTTPException(status_code=404, detail="Pack de capacités introuvable")


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
