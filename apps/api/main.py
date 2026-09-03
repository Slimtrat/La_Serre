from __future__ import annotations

import asyncio
import json
import re
from dataclasses import asdict
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from apps.api.assets import AssetSlot, AssetStore
from apps.api.episode_job_manager import EpisodeJobManager
from apps.api.episode_routes import create_episode_router
from apps.api.job_manager import JobManager
from apps.api.narrative_routes import create_narrative_router
from apps.api.schemas import (
    EpisodeGenerationRequest,
    GenerationRequest,
    StudioConfigRequest,
    WorkflowImportRequest,
    WorkflowKind,
    WorkflowProfileRequest,
)
from apps.api.workflow_setup import WorkflowSetup
from engine.config import Settings
from engine.generation.comfy.client import ComfyClient
from engine.generation.comfy.errors import WorkflowConfigurationError
from engine.generation.comfy.model_installer import ModelInstaller
from engine.generation.comfy.workflow_factory import WorkflowFactory
from engine.world.catalog import EpisodeCatalog

STATIC_DIR = Path(__file__).with_name("static")
SHOT_ID = re.compile(r"^S\d{2}E\d{3}-S\d{2}$")
EPISODE_ID = re.compile(r"^S\d{2}E\d{3}$")
MEDIA_FILES = {
    "keyframe.png",
    "keyframe-guide-1.png",
    "keyframe-guide-2.png",
    "clip.mp4",
    "generation.json",
    "prompt.txt",
}
EPISODE_MEDIA_FILES = {
    "episode.mp4": "video/mp4",
    "episode-generation.json": "application/json",
    "subtitles.fr.srt": "application/x-subrip",
}


def create_app(settings: Settings | None = None) -> FastAPI:
    fixed_settings = settings

    def current_settings() -> Settings:
        return fixed_settings or Settings.load()

    app = FastAPI(title="La Serre des Venins", version="0.2.0")
    assets = AssetStore(current_settings().output_dir)
    manager = JobManager(current_settings, assets)
    episode_manager = EpisodeJobManager(current_settings)
    setup = WorkflowSetup()
    factory = WorkflowFactory()
    catalog = EpisodeCatalog(current_settings().private_content_dir)

    def model_installer() -> ModelInstaller:
        resolved = current_settings()
        return ModelInstaller(
            factory.requirements,
            downloads_dir=resolved.downloads_dir,
            models_root=resolved.comfyui_models_dir,
        )

    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
    app.include_router(create_episode_router(catalog))
    app.include_router(create_narrative_router(current_settings, assets))

    @app.get("/", include_in_schema=False)
    def studio() -> FileResponse:
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready")
    @app.get("/api/status")
    async def ready() -> dict[str, object]:
        resolved = await asyncio.to_thread(current_settings)
        comfyui = False
        missing_nodes = sorted(factory.required_nodes)
        models = [
            {**asdict(requirement), "installed": False} for requirement in factory.requirements
        ]
        async with ComfyClient(
            str(resolved.comfyui_url),
            request_timeout_seconds=min(resolved.comfyui_timeout_seconds, 10),
            poll_interval_seconds=resolved.comfyui_poll_interval_seconds,
        ) as client:
            comfyui = await client.is_ready()
            if comfyui:
                missing_nodes, models = await _audit_comfy(client, factory)
        download_status = {
            str(item["filename"]): item
            for item in await asyncio.to_thread(model_installer().inspect)
        }
        models = [{**model, **download_status.get(str(model["filename"]), {})} for model in models]
        models_ready = all(bool(model["installed"]) for model in models)
        nodes_ready = not missing_nodes
        return {
            "status": (
                "ready"
                if resolved.profiles_configured and comfyui and models_ready and nodes_ready
                else "not_ready"
            ),
            "profiles_configured": resolved.profiles_configured,
            "comfyui": comfyui,
            "models_ready": models_ready,
            "models": models,
            "missing_nodes": missing_nodes,
            "comfyui_url": str(resolved.comfyui_url),
            "keyframe_profile": bool(
                resolved.keyframe_workflow_profile and resolved.keyframe_workflow_profile.is_file()
            ),
            "video_profile": bool(
                resolved.video_workflow_profile and resolved.video_workflow_profile.is_file()
            ),
            "downloads_dir": str(resolved.downloads_dir),
            "models_root": str(model_installer().models_root),
        }

    @app.post("/api/models/install")
    async def install_downloaded_models() -> dict[str, object]:
        try:
            installed = await asyncio.to_thread(model_installer().install_ready)
        except (FileExistsError, OSError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return {
            "status": "installed" if installed else "nothing_ready",
            "installed": installed,
            "restart_required": bool(installed),
        }

    @app.post("/api/workflows/generate")
    async def generate_workflows() -> dict[str, object]:
        generated = await asyncio.to_thread(factory.write)
        resolved = await asyncio.to_thread(current_settings)
        async with ComfyClient(str(resolved.comfyui_url)) as client:
            if not await client.is_ready():
                raise HTTPException(status_code=503, detail="ComfyUI est inaccessible")
            missing_nodes, models = await _audit_comfy(client, factory)
        return {
            "status": "generated",
            "preset": generated.preset,
            "keyframe_workflow": "workflows/local/keyframe.api.json",
            "video_workflow": "workflows/local/video.api.json",
            "missing_nodes": missing_nodes,
            "models": models,
        }

    @app.post("/api/config")
    async def save_config(payload: StudioConfigRequest) -> dict[str, str]:
        resolved = await asyncio.to_thread(current_settings)
        updated = resolved.model_copy(update={"comfyui_url": payload.comfyui_url})
        path = await asyncio.to_thread(updated.save_local)
        return {"status": "saved", "path": str(path)}

    @app.get("/api/example-shot")
    def example_shot() -> FileResponse:
        return FileResponse(Path("examples/shot.json"), media_type="application/json")

    @app.get("/api/workflows/{kind}")
    def inspect_workflow(kind: WorkflowKind) -> dict[str, object]:
        return setup.inspect_saved(kind)

    @app.post("/api/workflows/import")
    def import_workflow(payload: WorkflowImportRequest) -> dict[str, object]:
        try:
            return setup.import_workflow(payload.kind, payload.workflow)
        except (WorkflowConfigurationError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    @app.post("/api/workflows/profile")
    def save_profile(payload: WorkflowProfileRequest) -> dict[str, object]:
        try:
            return setup.save_profile(payload.kind, payload.bindings)
        except (FileNotFoundError, WorkflowConfigurationError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    @app.post("/api/jobs", status_code=202)
    async def start_job(payload: GenerationRequest) -> dict[str, object]:
        try:
            job = await manager.start(
                payload.shot,
                payload.mode,
                payload.force,
                payload.keyframe_source,
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return job.public()

    @app.get("/api/assets/{shot_id}")
    def list_assets(shot_id: str) -> dict[str, object]:
        try:
            return assets.list(shot_id)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    @app.put("/api/assets/{shot_id}/{slot}")
    async def put_asset(
        shot_id: str,
        slot: AssetSlot,
        request: Request,
        filename: str,
    ) -> dict[str, object]:
        content = await request.body()
        try:
            record = await asyncio.to_thread(
                assets.put,
                shot_id,
                slot,
                filename,
                request.headers.get("content-type", "application/octet-stream"),
                content,
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return {
            **asdict(record),
            "url": f"/api/assets/{shot_id}/{slot}/content",
        }

    @app.get("/api/assets/{shot_id}/{slot}/content")
    def get_asset(shot_id: str, slot: AssetSlot) -> FileResponse:
        try:
            found = assets.get(shot_id, slot)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if not found:
            raise HTTPException(status_code=404, detail="Artefact introuvable")
        record, path = found
        return FileResponse(path, media_type=record.media_type, filename=record.filename)

    @app.get("/api/jobs/{job_id}")
    async def get_job(job_id: str) -> dict[str, object]:
        job = manager.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Generation job not found")
        return job.public()

    @app.get("/api/media/{shot_id}/{filename}")
    def media(shot_id: str, filename: str) -> FileResponse:
        if not SHOT_ID.fullmatch(shot_id) or filename not in MEDIA_FILES:
            raise HTTPException(status_code=404, detail="Media not found")
        resolved = current_settings()
        path = resolved.output_dir / shot_id / filename
        if not path.is_file():
            raise HTTPException(status_code=404, detail="Media not found")
        media_type = "video/mp4" if filename.endswith(".mp4") else None
        return FileResponse(path, media_type=media_type)

    @app.get("/api/outputs/{shot_id}")
    def outputs(shot_id: str) -> dict[str, object]:
        if not SHOT_ID.fullmatch(shot_id):
            raise HTTPException(status_code=404, detail="Shot not found")
        destination = current_settings().output_dir / shot_id
        result: dict[str, object] = {
            "shot_id": shot_id,
            "status": None,
            "keyframe": None,
            "keyframes": [],
            "video": None,
        }
        if (destination / "keyframe.png").is_file():
            result["keyframe"] = f"/api/media/{shot_id}/keyframe.png"
            keyframes = [f"/api/media/{shot_id}/keyframe.png"]
            for filename in ("keyframe-guide-1.png", "keyframe-guide-2.png"):
                if (destination / filename).is_file():
                    keyframes.append(f"/api/media/{shot_id}/{filename}")
            result["keyframes"] = keyframes
        if (destination / "clip.mp4").is_file():
            result["video"] = f"/api/media/{shot_id}/clip.mp4"
        manifest = destination / "generation.json"
        if manifest.is_file():
            try:
                payload = json.loads(manifest.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                payload = {}
            if isinstance(payload, dict):
                result["status"] = payload.get("status")
        return result

    @app.post("/api/episodes/{episode_id}/jobs", status_code=202)
    async def start_episode_job(
        episode_id: str,
        payload: EpisodeGenerationRequest,
    ) -> dict[str, object]:
        if not EPISODE_ID.fullmatch(episode_id):
            raise HTTPException(status_code=404, detail="Episode not found")
        job = await episode_manager.start(episode_id, payload)
        return job.public()

    @app.get("/api/episode-jobs/{job_id}")
    async def get_episode_job(job_id: str) -> dict[str, object]:
        job = episode_manager.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Episode job not found")
        return job.public()

    @app.get("/api/episode-media/{episode_id}/{filename}")
    def episode_media(episode_id: str, filename: str) -> FileResponse:
        media_type = EPISODE_MEDIA_FILES.get(filename)
        if not EPISODE_ID.fullmatch(episode_id) or media_type is None:
            raise HTTPException(status_code=404, detail="Episode media not found")
        path = current_settings().output_dir / episode_id / filename
        if not path.is_file():
            raise HTTPException(status_code=404, detail="Episode media not found")
        return FileResponse(path, media_type=media_type, filename=filename)

    return app


app = create_app()


async def _audit_comfy(
    client: ComfyClient, factory: WorkflowFactory
) -> tuple[list[str], list[dict[str, object]]]:
    object_info = await client.get_object_info()
    missing_nodes = sorted(factory.required_nodes - set(object_info))
    folders = sorted({requirement.folder for requirement in factory.requirements})
    inventories = await asyncio.gather(*(client.get_models(folder) for folder in folders))
    installed_by_folder = {
        folder: {Path(item).name for item in inventory}
        for folder, inventory in zip(folders, inventories, strict=True)
    }
    models = [
        {
            **asdict(requirement),
            "installed": requirement.filename in installed_by_folder[requirement.folder],
        }
        for requirement in factory.requirements
    ]
    return missing_nodes, models
