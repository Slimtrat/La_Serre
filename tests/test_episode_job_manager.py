from pathlib import Path
from types import SimpleNamespace
from typing import Any, cast

import pytest

from apps.api.episode_job_manager import EpisodeJobManager
from apps.api.notifications import StudioNotificationLog
from apps.api.schemas import EpisodeGenerationRequest
from engine.config import Settings


class SuccessfulEpisodePipeline:
    def __init__(self, _media: object, _speech: object, on_progress: Any) -> None:
        self.on_progress = on_progress

    def run(self, _options: object) -> SimpleNamespace:
        self.on_progress("export", "completed", "Export prêt")
        return SimpleNamespace(subtitles=Path("subtitles.fr.srt"))


class FailingEpisodePipeline(SuccessfulEpisodePipeline):
    def run(self, _options: object) -> SimpleNamespace:
        self.on_progress("montage", "running", "Montage")
        raise RuntimeError("ffmpeg indisponible")


@pytest.mark.parametrize(
    ("pipeline", "level", "title", "status"),
    [
        (SuccessfulEpisodePipeline, "success", "Épisode finalisé", "FINAL"),
        (FailingEpisodePipeline, "error", "Échec du montage", "FAILED"),
    ],
)
async def test_episode_jobs_publish_persistent_completion_notification(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    pipeline: type[SuccessfulEpisodePipeline],
    level: str,
    title: str,
    status: str,
) -> None:
    output = tmp_path / "output"
    settings = Settings(_env_file=None, output_dir=output)
    monkeypatch.setattr("apps.api.episode_job_manager.EpisodePipeline", pipeline)
    monkeypatch.setattr(
        "apps.api.episode_job_manager.create_speech_synthesizer", lambda _tts: None
    )
    monkeypatch.setattr(
        "apps.api.episode_job_manager.FFmpegToolchain", lambda: object()
    )
    manager = EpisodeJobManager(lambda: settings)

    job = await manager.start("S01E001", EpisodeGenerationRequest(tts="none"))
    await _wait_for_tasks(manager)

    notifications = cast(
        list[dict[str, Any]],
        StudioNotificationLog(output).listing()["notifications"],
    )
    item = notifications[0]
    assert job.status == status
    assert item["level"] == level
    assert item["title"] == title
    assert item["source"] == "episode-job"
    assert item["context"] == {
        "job_id": job.id,
        "episode_id": "S01E001",
        "status": status,
    }


async def _wait_for_tasks(manager: EpisodeJobManager) -> None:
    while manager._tasks:
        await next(iter(manager._tasks))
