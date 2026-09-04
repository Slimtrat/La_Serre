from __future__ import annotations

import asyncio
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from apps.api.notifications import StudioNotificationLog
from apps.api.run_history import RunHistory
from apps.api.schemas import EpisodeGenerationRequest
from engine.audio.speech import create_speech_synthesizer
from engine.config import Settings
from engine.media.ffmpeg import FFmpegToolchain
from engine.production.episode_pipeline import EpisodePipeline, EpisodePipelineOptions

EPISODE_STAGES = ("voice", "mix", "montage", "export")


@dataclass(slots=True)
class EpisodeStudioJob:
    id: str
    episode_id: str
    status: str = "QUEUED"
    message: str = "En attente du moteur de montage"
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    completed_at: datetime | None = None
    stages: dict[str, dict[str, str]] = field(
        default_factory=lambda: {
            stage: {"status": "pending", "message": "En attente"}
            for stage in EPISODE_STAGES
        }
    )
    media: dict[str, str] = field(default_factory=dict)
    events: list[dict[str, object]] = field(default_factory=list)
    log_path: Path | None = field(default=None, repr=False)
    notification_log: StudioNotificationLog | None = field(default=None, repr=False)

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
            "episode_id": self.episode_id,
            "status": self.status,
            "message": self.message,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "stages": [{"id": stage, **self.stages[stage]} for stage in EPISODE_STAGES],
            "media": self.media,
            "events": self.events,
            "progress": self.progress(),
        }

    def progress(self) -> dict[str, object]:
        total = len(EPISODE_STAGES)
        completed = sum(
            stage["status"] == "completed" for stage in self.stages.values()
        )
        active_stage = next(
            (
                stage
                for stage in EPISODE_STAGES
                if self.stages[stage]["status"] in {"running", "failed"}
            ),
            None,
        )
        terminal = self.status == "FINAL"
        elapsed_until = self.completed_at or datetime.now(UTC)
        return {
            "percent": 100 if terminal else round(100 * completed / total),
            "completed": total if terminal else completed,
            "total": total,
            "active_stage": active_stage,
            "elapsed_seconds": max(
                0,
                round((elapsed_until - self.created_at).total_seconds()),
            ),
            "indeterminate": active_stage is not None and self.status == "GENERATING",
        }


class EpisodeJobManager:
    def __init__(self, settings_provider: Callable[[], Settings]) -> None:
        self.settings_provider = settings_provider
        self.jobs: dict[str, EpisodeStudioJob] = {}
        self._tasks: set[asyncio.Task[None]] = set()
        self._montage_slot = asyncio.Semaphore(1)

    async def start(
        self,
        episode_id: str,
        request: EpisodeGenerationRequest,
    ) -> EpisodeStudioJob:
        job = EpisodeStudioJob(id=uuid.uuid4().hex, episode_id=episode_id)
        self.jobs[job.id] = job
        try:
            settings = await asyncio.to_thread(self.settings_provider)
        except Exception:
            job.status = "FAILED"
            job.message = "Impossible de résoudre le projet actif"
            job.completed_at = datetime.now(UTC)
            raise
        job.notification_log = StudioNotificationLog(settings.output_dir)
        job.log_path = RunHistory(settings.output_dir).job_log_path(job.id)
        job.record_event("job", "queued", job.message)
        task = asyncio.create_task(self._execute(job, settings, request))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return job

    def get(self, job_id: str) -> EpisodeStudioJob | None:
        return self.jobs.get(job_id)

    def has_active_jobs(self) -> bool:
        return any(job.status in {"QUEUED", "GENERATING"} for job in self.jobs.values())

    def latest_active(self) -> EpisodeStudioJob | None:
        active = [
            job
            for job in self.jobs.values()
            if job.status in {"QUEUED", "GENERATING"}
        ]
        return max(active, key=lambda job: job.created_at, default=None)

    async def _execute(
        self,
        job: EpisodeStudioJob,
        settings: Settings,
        request: EpisodeGenerationRequest,
    ) -> None:
        async with self._montage_slot:
            job.status = "GENERATING"
            job.message = "Préparation de l'épisode"
            job.record_event("job", "running", job.message)
            try:
                history = RunHistory(settings.output_dir)
                archived_master = await asyncio.to_thread(
                    history.archive_master, job.episode_id
                )
                speech = await asyncio.to_thread(create_speech_synthesizer, request.tts)
                media = await asyncio.to_thread(FFmpegToolchain)
                pipeline = EpisodePipeline(
                    media,
                    speech,
                    on_progress=lambda stage, status, message: self._progress(
                        job, stage, status, message
                    ),
                )
                result = await asyncio.to_thread(
                    pipeline.run,
                    EpisodePipelineOptions(
                        episode_id=job.episode_id,
                        private_root=settings.private_content_dir,
                        output_root=settings.output_dir,
                        width=request.width,
                        height=request.height,
                        fps=request.fps,
                        tts_enabled=request.tts != "none",
                        allow_stills=request.allow_stills,
                        force=request.force or archived_master is not None,
                    ),
                )
                job.status = "FINAL"
                job.message = "Épisode final vérifié"
                job.media = {
                    "video": f"/api/episode-media/{job.episode_id}/episode.mp4",
                    "manifest": (
                        f"/api/episode-media/{job.episode_id}/episode-generation.json"
                    ),
                }
                if result.subtitles:
                    job.media["subtitles"] = (
                        f"/api/episode-media/{job.episode_id}/subtitles.fr.srt"
                    )
            except Exception as exc:
                job.status = "FAILED"
                job.message = str(exc)
                running = next(
                    (
                        stage
                        for stage in EPISODE_STAGES
                        if job.stages[stage]["status"] == "running"
                    ),
                    None,
                )
                if running:
                    job.stages[running] = {"status": "failed", "message": str(exc)}
            finally:
                job.completed_at = datetime.now(UTC)
                job.record_event("job", job.status.lower(), job.message)
                if job.notification_log is not None:
                    await asyncio.to_thread(self._notify_completion, job)

    @staticmethod
    def _notify_completion(job: EpisodeStudioJob) -> None:
        if job.notification_log is None:
            return
        failed = job.status == "FAILED"
        job.notification_log.publish(
            "error" if failed else "success",
            "Échec du montage" if failed else "Épisode finalisé",
            job.message,
            source="episode-job",
            context={
                "job_id": job.id,
                "episode_id": job.episode_id,
                "status": job.status,
            },
        )

    @staticmethod
    def _progress(
        job: EpisodeStudioJob,
        stage: str,
        status: str,
        message: str,
    ) -> None:
        if stage in job.stages:
            job.stages[stage] = {"status": status, "message": message}
        job.message = message
        job.record_event(stage, status, message)
