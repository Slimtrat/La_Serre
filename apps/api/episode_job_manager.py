from __future__ import annotations

import asyncio
import sys
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime

from apps.api.schemas import EpisodeGenerationRequest
from engine.audio.speech import WindowsSapiSpeechSynthesizer
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
        task = asyncio.create_task(self._execute(job, request))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return job

    def get(self, job_id: str) -> EpisodeStudioJob | None:
        return self.jobs.get(job_id)

    async def _execute(
        self,
        job: EpisodeStudioJob,
        request: EpisodeGenerationRequest,
    ) -> None:
        async with self._montage_slot:
            job.status = "GENERATING"
            job.message = "Préparation de l'épisode"
            try:
                settings = await asyncio.to_thread(self.settings_provider)
                speech = None
                if request.tts == "sapi" or (
                    request.tts == "auto" and sys.platform == "win32"
                ):
                    speech = await asyncio.to_thread(WindowsSapiSpeechSynthesizer)
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
                        force=request.force,
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
