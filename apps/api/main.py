from __future__ import annotations

import asyncio
import json
import re
from dataclasses import asdict
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from apps.api.asset_catalog import ProjectAssetCatalog
from apps.api.assets import AssetSlot, AssetStore
from apps.api.bible_routes import create_bible_router
from apps.api.coherence_routes import create_coherence_router
from apps.api.context_graph import create_context_graph_router
from apps.api.demo_routes import create_demo_router
from apps.api.editorial_routes import create_editorial_router
from apps.api.episode_job_manager import EpisodeJobManager
from apps.api.episode_routes import create_episode_router
from apps.api.guided_autopilot_routes import create_guided_autopilot_router
from apps.api.guided_routes import create_guided_router
from apps.api.job_manager import JobManager
from apps.api.narrative_routes import create_narrative_router
from apps.api.notifications import StudioNotificationLog
from apps.api.production_queue import ProductionQueueManager
from apps.api.production_queue_routes import create_production_queue_router
from apps.api.project_storage_routes import create_project_storage_router
from apps.api.projects import ProjectRegistry
from apps.api.run_history import RUN_FILES, RunHistory
from apps.api.schemas import (
    AssetReuseRequest,
    EpisodeGenerationRequest,
    GenerationRequest,
    NotificationCreateRequest,
    NotificationReadRequest,
    ProjectCreateRequest,
    StageGenerationRequest,
    StudioConfigRequest,
    WorkflowImportRequest,
    WorkflowKind,
    WorkflowProfileRequest,
)
from apps.api.stage_actions import ShotStageService, StageKind
from apps.api.workflow_graph import WORKFLOW_GRAPH_KINDS, build_workflow_graph
from apps.api.workflow_setup import WorkflowSetup
from apps.api.workflow_template_routes import create_workflow_template_router
from apps.desktop.service_launcher import (
    control_service,
    service_logs,
    service_supervisor_listing,
)
from apps.desktop.status import build_desktop_status
from apps.version import __version__
from engine.config import Settings
from engine.generation.comfy.client import ComfyClient
from engine.generation.comfy.errors import WorkflowConfigurationError
from engine.generation.comfy.model_installer import ModelInstaller
from engine.generation.comfy.workflow_factory import WorkflowFactory
from engine.world.bible import BibleRegistry
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
    "voice.wav",
    "voice.mp3",
}
EPISODE_MEDIA_FILES = {
    "episode.mp4": "video/mp4",
    "episode-generation.json": "application/json",
    "subtitles.fr.srt": "application/x-subrip",
    "music.wav": "audio/wav",
}


def create_app(settings: Settings | None = None) -> FastAPI:
    fixed_settings = settings

    def base_settings() -> Settings:
        return fixed_settings or Settings.load()

    initial = base_settings()
    project_registry = ProjectRegistry(
        initial,
        config_path=(
            initial.output_dir / ".studio" / "projects.json"
            if fixed_settings is not None
            else Path("workflows/local/studio-projects.json")
        ),
        projects_root=(
            initial.output_dir.parent / "projects"
            if fixed_settings is not None
            else Path("projects")
        ),
    )

    def current_settings() -> Settings:
        return project_registry.settings(base_settings())

    def assets() -> AssetStore:
        return AssetStore(current_settings().output_dir)

    def asset_catalog() -> ProjectAssetCatalog:
        resolved = current_settings()
        return ProjectAssetCatalog(resolved.output_dir, resolved.private_content_dir)

    def catalog() -> EpisodeCatalog:
        return EpisodeCatalog(current_settings().private_content_dir)

    def notifications() -> StudioNotificationLog:
        return StudioNotificationLog(current_settings().output_dir)

    app = FastAPI(title="La Serre des Venins", version=__version__)
    manager = JobManager(current_settings, assets)
    episode_manager = EpisodeJobManager(current_settings)
    stage_service = ShotStageService(current_settings)
    production_queue = ProductionQueueManager(current_settings, catalog, manager, stage_service)
    setup = WorkflowSetup()
    factory = WorkflowFactory()

    def model_installer() -> ModelInstaller:
        resolved = current_settings()
        return ModelInstaller(
            factory.requirements,
            downloads_dir=resolved.downloads_dir,
            models_root=resolved.comfyui_models_dir,
        )

    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
    app.include_router(
        create_episode_router(catalog, lambda: current_settings().output_dir, current_settings)
    )
    app.include_router(create_context_graph_router(catalog, lambda: current_settings().output_dir))
    app.include_router(create_coherence_router(current_settings, catalog))
    app.include_router(create_narrative_router(current_settings, assets, catalog))
    app.include_router(create_guided_router(current_settings))
    app.include_router(create_guided_autopilot_router(current_settings))
    app.include_router(create_workflow_template_router(current_settings))
    app.include_router(create_editorial_router(current_settings))
    app.include_router(
        create_demo_router(
            lambda: current_settings().output_dir,
            notifications,
            current_settings,
        )
    )
    app.include_router(create_production_queue_router(production_queue))
    app.include_router(
        create_project_storage_router(
            project_registry,
            has_active_work=lambda: (
                manager.has_active_jobs()
                or episode_manager.has_active_jobs()
                or stage_service.has_active_operations()
                or production_queue.has_active_jobs()
            ),
        )
    )
    app.include_router(
        create_bible_router(
            lambda: BibleRegistry(current_settings().private_content_dir),
            lambda: current_settings().output_dir,
        )
    )

    @app.get("/api/projects")
    def list_projects() -> dict[str, object]:
        return project_registry.listing()

    @app.post("/api/projects", status_code=201)
    def create_project(payload: ProjectCreateRequest) -> dict[str, object]:
        if (
            manager.has_active_jobs()
            or episode_manager.has_active_jobs()
            or stage_service.has_active_operations()
            or production_queue.has_active_jobs()
        ):
            raise HTTPException(
                status_code=409,
                detail="Attends la fin des générations avant de créer un projet.",
            )
        try:
            project = project_registry.create(
                payload.name,
                clone_content=payload.clone_content,
            )
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        notifications().publish(
            "success",
            "Projet créé",
            f"{project.name} est maintenant le projet actif.",
            source="projects",
        )
        return project_registry.listing()

    @app.post("/api/projects/{project_id}/activate")
    def activate_project(project_id: str) -> dict[str, object]:
        if (
            manager.has_active_jobs()
            or episode_manager.has_active_jobs()
            or stage_service.has_active_operations()
            or production_queue.has_active_jobs()
        ):
            raise HTTPException(
                status_code=409,
                detail="Attends la fin des générations avant de changer de projet.",
            )
        try:
            project = project_registry.activate(project_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Projet introuvable") from exc
        notifications().publish(
            "info",
            "Projet actif",
            f"Le Studio travaille maintenant dans {project.name}.",
            source="projects",
        )
        return project_registry.listing()

    @app.delete("/api/projects/{project_id}")
    def delete_discovery_project(project_id: str) -> dict[str, object]:
        if (
            manager.has_active_jobs()
            or episode_manager.has_active_jobs()
            or stage_service.has_active_operations()
            or production_queue.has_active_jobs()
        ):
            raise HTTPException(
                status_code=409,
                detail="Attends la fin des générations avant de supprimer un projet.",
            )
        try:
            project = project_registry.delete_discovery(project_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Projet introuvable") from exc
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        notifications().publish(
            "info",
            "Projet Découverte retiré",
            f"{project.name} a été retiré sans supprimer les autres projets.",
            source="projects",
        )
        return project_registry.listing()

    @app.get("/api/notifications")
    def list_notifications(limit: int = 100) -> dict[str, object]:
        return notifications().listing(limit=max(1, min(limit, 200)))

    @app.post("/api/notifications", status_code=201)
    def create_notification(payload: NotificationCreateRequest) -> dict[str, object]:
        return notifications().publish(
            payload.level,
            payload.title,
            payload.message,
            source=payload.source,
        )

    @app.post("/api/notifications/read")
    def read_notifications(payload: NotificationReadRequest) -> dict[str, object]:
        return notifications().mark_read(payload.ids)

    @app.get("/", include_in_schema=False)
    def studio() -> FileResponse:
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/runtime/services")
    def runtime_services() -> dict[str, object]:
        return service_supervisor_listing()

    @app.post("/api/runtime/services/{service_name}/{action}")
    def runtime_service_action(service_name: str, action: str) -> dict[str, object]:
        if action not in {"check", "start", "stop", "restart"}:
            raise HTTPException(status_code=422, detail="Action runtime inconnue")
        listing = service_supervisor_listing()
        raw_services = listing.get("services")
        runtime_services = raw_services if isinstance(raw_services, list) else []
        known = {
            str(item.get("name"))
            for item in runtime_services
            if isinstance(item, dict)
        }
        if service_name not in known:
            raise HTTPException(status_code=404, detail="Runtime local introuvable")
        try:
            service = control_service(service_name, action)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        action_label = {
            "check": "Diagnostic actualisé",
            "start": "Démarrage demandé",
            "stop": "Arrêt demandé",
            "restart": "Redémarrage demandé",
        }[action]
        notifications().publish(
            "info",
            action_label,
            f"{service.get('display_name', service_name)} · {service.get('detail', '')}",
            source="runtime",
        )
        return {"service": service, "runtime": service_supervisor_listing()}

    @app.get("/api/runtime/services/{service_name}/logs")
    def runtime_service_logs(service_name: str, limit: int = 200) -> dict[str, object]:
        try:
            return service_logs(service_name, limit=max(1, min(limit, 1000)))
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @app.get("/api/desktop/status")
    def desktop_status() -> dict[str, object]:
        """Return the compact, side-effect-free state consumed by the tray."""
        return build_desktop_status(
            service_supervisor_listing(),
            production_queue.listing(),
            has_direct_activity=(
                manager.has_active_jobs()
                or episode_manager.has_active_jobs()
                or stage_service.has_active_operations()
            ),
            notifications=notifications().listing(limit=20),
        )

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
        models_ready = all(
            bool(model["installed"]) if comfyui else model.get("state") == "installed"
            for model in models
        )
        nodes_ready = not missing_nodes
        return {
            "version": __version__,
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
            "keyframe_guide_profile": bool(
                resolved.keyframe_guide_workflow_profile
                and resolved.keyframe_guide_workflow_profile.is_file()
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
            "keyframe_guide_workflow": "workflows/local/keyframe-guide.api.json",
            "video_workflow": "workflows/local/video.api.json",
            "missing_nodes": missing_nodes,
            "models": models,
        }

    @app.post("/api/config")
    async def save_config(payload: StudioConfigRequest) -> dict[str, str]:
        resolved = await asyncio.to_thread(base_settings)
        updated = resolved.model_copy(update={"comfyui_url": payload.comfyui_url})
        path = await asyncio.to_thread(updated.save_local)
        return {"status": "saved", "path": str(path)}

    @app.get("/api/example-shot")
    def example_shot() -> FileResponse:
        return FileResponse(Path("examples/shot.json"), media_type="application/json")

    @app.get("/api/workflows/{kind}")
    def inspect_workflow(kind: WorkflowKind) -> dict[str, object]:
        return setup.inspect_saved(kind)

    @app.get("/api/workflow-graphs/{kind}")
    def workflow_graph(kind: str) -> dict[str, object]:
        if kind not in WORKFLOW_GRAPH_KINDS:
            raise HTTPException(status_code=404, detail="Workflow not found")
        workflow_path = Path("workflows/local") / f"{kind}.api.json"
        profile_path = Path("workflows/local") / f"{kind}.profile.json"
        if not workflow_path.is_file():
            raise HTTPException(status_code=404, detail="Workflow not configured")
        try:
            return build_workflow_graph(kind, workflow_path, profile_path)
        except (OSError, ValueError, WorkflowConfigurationError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

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

    @app.post("/api/stages/{kind}")
    async def generate_stage(
        kind: StageKind,
        payload: StageGenerationRequest,
    ) -> dict[str, object]:
        shot_id = str(payload.shot.get("id", ""))
        if manager.active_for_shot(shot_id):
            raise HTTPException(
                status_code=409,
                detail="Une génération GPU est déjà active pour ce plan.",
            )
        try:
            return await asyncio.to_thread(
                stage_service.generate,
                kind,
                payload.shot,
                tts=payload.tts,
            )
        except (OSError, RuntimeError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    @app.get("/api/assets/{shot_id}")
    def list_assets(shot_id: str) -> dict[str, object]:
        try:
            return assets().list(shot_id)
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
                assets().put,
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
            found = assets().get(shot_id, slot)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if not found:
            raise HTTPException(status_code=404, detail="Artefact introuvable")
        record, path = found
        return FileResponse(path, media_type=record.media_type, filename=record.filename)

    @app.get("/api/asset-catalog")
    def list_asset_catalog(
        q: str | None = None,
        kind: str | None = None,
        character: str | None = None,
        location: str | None = None,
        episode: str | None = None,
        status: str | None = None,
    ) -> dict[str, object]:
        return asset_catalog().listing(
            query=q,
            kind=kind,
            character=character,
            location=location,
            episode=episode,
            status=status,
        )

    @app.get("/api/asset-catalog/{asset_id}")
    def get_catalog_asset(asset_id: str) -> dict[str, object]:
        try:
            return asset_catalog().get(asset_id)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Asset introuvable") from exc

    @app.get("/api/asset-catalog/{asset_id}/content")
    def get_catalog_asset_content(asset_id: str) -> FileResponse:
        try:
            catalog = asset_catalog()
            item = catalog.get(asset_id)
            path = catalog.content_path(asset_id, refresh=False)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Asset introuvable") from exc
        return FileResponse(path, media_type=str(item["media_type"]))

    @app.post("/api/assets/{shot_id}/{slot}/reuse")
    def reuse_catalog_asset(
        shot_id: str,
        slot: AssetSlot,
        payload: AssetReuseRequest,
    ) -> dict[str, object]:
        try:
            record = asset_catalog().reuse(shot_id, slot, payload.asset_id)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Asset introuvable") from exc
        return {
            **asdict(record),
            "url": f"/api/assets/{shot_id}/{slot}/content",
        }

    @app.get("/api/jobs/{job_id}")
    async def get_job(job_id: str) -> dict[str, object]:
        job = manager.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Generation job not found")
        return job.public()

    @app.get("/api/activity")
    async def current_activity() -> dict[str, object]:
        shot_job = manager.latest_active()
        episode_job = episode_manager.latest_active()
        candidates = [
            (shot_job.created_at, "shot", shot_job)
            for shot_job in [shot_job]
            if shot_job is not None
        ] + [
            (episode_job.created_at, "episode", episode_job)
            for episode_job in [episode_job]
            if episode_job is not None
        ]
        if not candidates:
            return {"activity": None}
        _created_at, kind, job = max(candidates, key=lambda candidate: candidate[0])
        return {"activity": {"kind": kind, **job.public()}}

    @app.get("/api/history/{shot_id}")
    def generation_history(shot_id: str) -> dict[str, object]:
        try:
            runs = RunHistory(current_settings().output_dir).list_runs(shot_id)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        return {"shot_id": shot_id, "runs": runs}

    @app.post("/api/history/{shot_id}/{run_id}/restore")
    def restore_generation(shot_id: str, run_id: str) -> dict[str, object]:
        try:
            return RunHistory(current_settings().output_dir).restore(shot_id, run_id)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Version not found") from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    @app.get("/api/history-media/{shot_id}/{run_id}/{filename}")
    def history_media(shot_id: str, run_id: str, filename: str) -> FileResponse:
        if filename not in RUN_FILES:
            raise HTTPException(status_code=404, detail="History media not found")
        try:
            path = RunHistory(current_settings().output_dir).media_path(shot_id, run_id, filename)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail="History media not found") from exc
        if not path.is_file():
            raise HTTPException(status_code=404, detail="History media not found")
        media_type = "video/mp4" if filename.endswith(".mp4") else None
        return FileResponse(path, media_type=media_type, filename=filename)

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

    @app.get("/api/episodes/{episode_id}/media-status")
    def episode_media_status(episode_id: str) -> dict[str, object]:
        """Describe optional master files without turning their absence into an error."""
        if not EPISODE_ID.fullmatch(episode_id):
            raise HTTPException(status_code=404, detail="Episode not found")
        output_dir = current_settings().output_dir / episode_id
        manifest_path = output_dir / "episode-generation.json"
        manifest: dict[str, object] = {}
        if manifest_path.is_file():
            try:
                payload = json.loads(manifest_path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                payload = {}
            if isinstance(payload, dict):
                manifest = payload
        return {
            "exists": manifest_path.is_file(),
            "video": (output_dir / "episode.mp4").is_file(),
            "manifest": manifest_path.is_file(),
            "subtitles": bool(manifest.get("subtitles"))
            and (output_dir / "subtitles.fr.srt").is_file(),
        }

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
