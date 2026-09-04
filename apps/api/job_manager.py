from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from apps.api.assets import AssetStore
from apps.api.notifications import StudioNotificationLog
from apps.api.run_history import RunHistory
from apps.api.schemas import JobMode
from engine.config import Settings
from engine.director.models import Shot
from engine.generation.comfy.client import ComfyClient
from engine.production.shot_pipeline import ShotPipeline, ShotPipelineOptions

STAGES = ("input", "prompt", "references", "keyframe", "video", "artifacts")


@dataclass(slots=True)
class StudioJob:
    id: str
    shot_id: str
    mode: JobMode
    keyframe_total: int = 1
    status: str = "QUEUED"
    message: str = "En attente du GPU"
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None
    active_workflow: str | None = None
    stages: dict[str, dict[str, str]] = field(
        default_factory=lambda: {
            stage: {"status": "pending", "message": "En attente"} for stage in STAGES
        }
    )
    media: dict[str, object] = field(default_factory=dict)
    events: list[dict[str, object]] = field(default_factory=list)
    log_path: Path | None = field(default=None, repr=False)
    notification_log: StudioNotificationLog | None = field(default=None, repr=False)
    archived_run_id: str | None = None

    def record_event(self, stage: str, status: str, message: str) -> None:
        event: dict[str, object] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "stage": stage,
            "status": status,
            "message": message,
        }
        self.events.append(event)
        if self.log_path is not None:
            RunHistory.append_event(self.log_path, event)

    def public(self) -> dict[str, object]:
        return {
            "id": self.id,
            "shot_id": self.shot_id,
            "mode": self.mode,
            "status": self.status,
            "message": self.message,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "active_workflow": self.active_workflow,
            "stages": [{"id": stage, **self.stages[stage]} for stage in STAGES],
            "media": self.media,
            "events": self.events,
            "archived_run_id": self.archived_run_id,
            "progress": self.progress(),
        }

    def progress(self) -> dict[str, object]:
        stages = [
            (stage_id, self.stages[stage_id])
            for stage_id in STAGES
            if self.stages[stage_id]["status"] != "skipped"
        ]
        total = len(stages)
        completed = sum(
            stage["status"] == "completed" for _stage_id, stage in stages
        )
        active_stage = next(
            (
                stage_id
                for stage_id, stage in stages
                if stage["status"] in {"running", "failed"}
            ),
            None,
        )
        equivalent = float(completed)
        indeterminate = active_stage is not None
        if active_stage == "keyframe":
            keyframes = self.media.get("keyframe_progress")
            if isinstance(keyframes, dict):
                done = keyframes.get("completed")
                expected = keyframes.get("total")
                if isinstance(done, int) and isinstance(expected, int) and expected > 0:
                    equivalent += min(done / expected, 0.99)
                    indeterminate = False
        terminal = self.status in {"GENERATED", "AWAITING_KEYFRAME_APPROVAL"}
        percent = 100 if terminal else round(100 * equivalent / max(1, total))
        elapsed_until = self.completed_at or datetime.now(UTC)
        return {
            "percent": min(100, max(0, percent)),
            "completed": total if terminal else completed,
            "total": total,
            "active_stage": active_stage,
            "elapsed_seconds": max(
                0,
                round((elapsed_until - self.created_at).total_seconds()),
            ),
            "indeterminate": indeterminate and self.status == "GENERATING",
        }


class JobManager:
    def __init__(
        self,
        settings_provider: Callable[[], Settings],
        assets_provider: Callable[[], AssetStore],
    ) -> None:
        self.settings_provider = settings_provider
        self.assets_provider = assets_provider
        self.jobs: dict[str, StudioJob] = {}
        self._tasks: set[asyncio.Task[None]] = set()
        self._gpu_slot = asyncio.Semaphore(1)

    async def start(
        self,
        shot_payload: dict[str, object],
        mode: JobMode,
        force: bool,
        keyframe_source: str = "model",
    ) -> StudioJob:
        shot = Shot.model_validate(shot_payload)
        generated_keyframe_total = len(shot.visual_beats) if shot.visual_beats else 1
        job = StudioJob(
            id=uuid.uuid4().hex,
            shot_id=shot.id,
            mode=mode,
            keyframe_total=(
                generated_keyframe_total
                if mode in {"all", "keyframe"} and keyframe_source == "model"
                else 1
            ),
        )
        if mode == "keyframe":
            job.stages["video"] = {"status": "skipped", "message": "Validation manuelle"}
        self.jobs[job.id] = job
        try:
            settings = await asyncio.to_thread(self.settings_provider)
        except Exception:
            job.status = "FAILED"
            job.message = "Impossible de résoudre le projet actif"
            job.completed_at = datetime.now(UTC)
            raise
        history = RunHistory(settings.output_dir)
        job.log_path = history.job_log_path(job.id)
        job.notification_log = StudioNotificationLog(settings.output_dir)
        job.record_event("job", "queued", job.message)
        request_path = settings.output_dir / ".studio" / f"{job.id}.shot.json"
        await asyncio.to_thread(self._write_shot, request_path, shot)
        task = asyncio.create_task(
            self._execute(job, settings, request_path, mode, force, keyframe_source)
        )
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return job

    def get(self, job_id: str) -> StudioJob | None:
        return self.jobs.get(job_id)

    def active_for_shot(self, shot_id: str) -> bool:
        return any(
            job.shot_id == shot_id and job.status in {"QUEUED", "GENERATING"}
            for job in self.jobs.values()
        )

    def has_active_jobs(self) -> bool:
        return any(job.status in {"QUEUED", "GENERATING"} for job in self.jobs.values())

    def latest_active(self) -> StudioJob | None:
        active = [
            job
            for job in self.jobs.values()
            if job.status in {"QUEUED", "GENERATING"}
        ]
        return max(active, key=lambda job: job.created_at, default=None)

    async def _execute(
        self,
        job: StudioJob,
        settings: Settings,
        shot_path: Path,
        mode: JobMode,
        force: bool,
        keyframe_source: str,
    ) -> None:
        async with self._gpu_slot:
            job.status = "GENERATING"
            job.message = "Pipeline démarré"
            history: RunHistory | None = None
            try:
                history = RunHistory(settings.output_dir)
                if not settings.profiles_configured:
                    raise RuntimeError(
                        "Importe et configure les workflows keyframe et vidéo dans Réglages."
                    )
                assert settings.keyframe_workflow_profile is not None
                assert settings.keyframe_guide_workflow_profile is not None
                assert settings.video_workflow_profile is not None
                archived = await asyncio.to_thread(history.archive_current, job.shot_id)
                if archived is not None:
                    job.archived_run_id = str(archived["id"])
                    job.record_event(
                        "history",
                        "completed",
                        f"Version précédente archivée sous {job.archived_run_id}",
                    )
                master_run = await asyncio.to_thread(
                    history.invalidate_master,
                    job.shot_id.rsplit("-S", 1)[0],
                )
                if master_run is not None:
                    job.record_event(
                        "history",
                        "completed",
                        f"Master aval archivé sous {master_run}",
                    )
                from_keyframe: Path | None = None
                guide_keyframes: tuple[Path, ...] = ()
                if mode == "video" or keyframe_source == "manual":
                    if keyframe_source == "manual":
                        manual = await asyncio.to_thread(
                            self.assets_provider().get, job.shot_id, "keyframe"
                        )
                        if not manual:
                            raise RuntimeError("Dépose d’abord une keyframe manuelle.")
                        from_keyframe = manual[1]
                    else:
                        from_keyframe = settings.output_dir / job.shot_id / "keyframe.png"
                        guide_keyframes = tuple(
                            path
                            for path in (
                                settings.output_dir / job.shot_id / "keyframe-guide-1.png",
                                settings.output_dir / job.shot_id / "keyframe-guide-2.png",
                            )
                            if path.is_file()
                        )
                async with ComfyClient(
                    str(settings.comfyui_url),
                    request_timeout_seconds=settings.comfyui_timeout_seconds,
                    poll_interval_seconds=settings.comfyui_poll_interval_seconds,
                ) as client:
                    pipeline = ShotPipeline(
                        client,
                        on_progress=lambda stage, status, message: self._progress(
                            job, settings.output_dir, stage, status, message
                        ),
                    )
                    record = await pipeline.run(
                        ShotPipelineOptions(
                            shot_path=shot_path,
                            output_root=settings.output_dir,
                            keyframe_profile=settings.keyframe_workflow_profile,
                            keyframe_guide_profile=settings.keyframe_guide_workflow_profile,
                            video_profile=settings.video_workflow_profile,
                            keyframe_only=mode == "keyframe",
                            from_keyframe=from_keyframe,
                            guide_keyframes=guide_keyframes,
                            continuity_keyframe=(
                                self._previous_shot_pose(settings.output_dir, job.shot_id)
                                if mode in {"all", "keyframe"}
                                and keyframe_source == "model"
                                else None
                            ),
                            force=force or archived is not None,
                            timeout_seconds=settings.comfyui_timeout_seconds,
                        )
                    )
                job.status = record.status.value
                job.message = "Keyframe à valider" if mode == "keyframe" else "Plan généré"
                job.active_workflow = None
                self._refresh_media(job, settings.output_dir)
            except Exception as exc:
                job.status = "FAILED"
                job.message = str(exc)
                job.active_workflow = None
            finally:
                job.completed_at = datetime.now(UTC)
                job.record_event("job", job.status.lower(), job.message)
                if history is not None:
                    await asyncio.to_thread(history.attach_job_log, job.id, job.shot_id)
                if job.notification_log is not None:
                    await asyncio.to_thread(self._notify_completion, job)

    @staticmethod
    def _notify_completion(job: StudioJob) -> None:
        if job.notification_log is None:
            return
        failed = job.status == "FAILED"
        job.notification_log.publish(
            "error" if failed else "success",
            "Échec de génération du plan" if failed else "Plan généré",
            job.message,
            source="shot-job",
            context={
                "job_id": job.id,
                "shot_id": job.shot_id,
                "mode": job.mode,
                "status": job.status,
                "archived_run_id": job.archived_run_id or "",
            },
        )

    @classmethod
    def _progress(
        cls,
        job: StudioJob,
        output_root: Path,
        stage: str,
        status: str,
        message: str,
    ) -> None:
        if stage in job.stages:
            job.stages[stage] = {"status": status, "message": message}
        job.message = message
        job.record_event(stage, status, message)
        if stage in {"keyframe", "video", "artifacts"}:
            cls._refresh_media(job, output_root)
        if stage == "keyframe" and status == "running":
            progress = job.media.get("keyframe_progress", {})
            completed = progress.get("completed", 0) if isinstance(progress, dict) else 0
            job.active_workflow = "keyframe" if completed == 0 else "keyframe-guide"
        elif stage == "video":
            job.active_workflow = "video"

    @staticmethod
    def _refresh_media(job: StudioJob, output_root: Path) -> None:
        destination = output_root / job.shot_id
        keyframe_names = (
            "keyframe.png",
            "keyframe-guide-1.png",
            "keyframe-guide-2.png",
        )
        keyframes = [
            f"/api/media/{job.shot_id}/{filename}"
            for filename in keyframe_names
            if (destination / filename).is_file()
        ]
        if keyframes:
            job.media["keyframe"] = keyframes[0]
            job.media["keyframes"] = keyframes
        job.media["keyframe_progress"] = {
            "completed": len(keyframes),
            "total": job.keyframe_total,
        }
        if (destination / "clip.mp4").is_file():
            job.media["video"] = f"/api/media/{job.shot_id}/clip.mp4"

    @staticmethod
    def _write_shot(path: Path, shot: Shot) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(shot.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    @staticmethod
    def _previous_shot_pose(output_root: Path, shot_id: str) -> Path | None:
        prefix, separator, number = shot_id.rpartition("-S")
        if not separator or not number.isdigit() or int(number) <= 1:
            return None
        previous_id = f"{prefix}-S{int(number) - 1:02d}"
        destination = output_root / previous_id
        for filename in ("keyframe-guide-2.png", "keyframe-guide-1.png", "keyframe.png"):
            candidate = destination / filename
            if candidate.is_file():
                return candidate
        return None
