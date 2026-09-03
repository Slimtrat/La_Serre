import json
from collections.abc import Callable
from pathlib import Path
from typing import Any, cast

import pytest

from apps.api.assets import AssetStore
from apps.api.job_manager import JobManager, StudioJob
from apps.api.notifications import StudioNotificationLog
from engine.config import Settings


def shot_payload() -> dict[str, object]:
    payload = json.loads(Path("examples/shot.json").read_text(encoding="utf-8"))
    return cast(dict[str, object], payload)


def test_job_media_exposes_keyframes_and_clip_progressively(tmp_path: Path) -> None:
    job = StudioJob(
        id="job-1",
        shot_id="S01E001-S01",
        mode="all",
        keyframe_total=3,
    )
    destination = tmp_path / job.shot_id
    destination.mkdir()

    (destination / "keyframe.png").write_bytes(b"start")
    JobManager._refresh_media(job, tmp_path)

    assert job.media["keyframes"] == ["/api/media/S01E001-S01/keyframe.png"]
    assert job.media["keyframe_progress"] == {"completed": 1, "total": 3}
    assert "video" not in job.media

    (destination / "keyframe-guide-1.png").write_bytes(b"middle")
    (destination / "keyframe-guide-2.png").write_bytes(b"end")
    (destination / "clip.mp4").write_bytes(b"video")
    JobManager._refresh_media(job, tmp_path)

    assert job.media["keyframes"] == [
        "/api/media/S01E001-S01/keyframe.png",
        "/api/media/S01E001-S01/keyframe-guide-1.png",
        "/api/media/S01E001-S01/keyframe-guide-2.png",
    ]
    assert job.media["keyframe_progress"] == {"completed": 3, "total": 3}
    assert job.media["video"] == "/api/media/S01E001-S01/clip.mp4"


def test_previous_shot_pose_prefers_the_final_guide(tmp_path: Path) -> None:
    previous = tmp_path / "S01E001-S04"
    previous.mkdir()
    (previous / "keyframe.png").write_bytes(b"start")
    final = previous / "keyframe-guide-2.png"
    final.write_bytes(b"end")

    assert JobManager._previous_shot_pose(tmp_path, "S01E001-S05") == final
    assert JobManager._previous_shot_pose(tmp_path, "S01E001-S01") is None


def test_job_records_persistent_progress_events(tmp_path: Path) -> None:
    job = StudioJob(id="job-1", shot_id="S01E001-S01", mode="all")
    job.log_path = tmp_path / "job-1.jsonl"

    JobManager._progress(job, tmp_path, "keyframe", "running", "Pose 1/3 disponible")

    assert job.events[-1]["stage"] == "keyframe"
    assert "Pose 1/3" in job.log_path.read_text(encoding="utf-8")


async def test_failed_shot_job_publishes_persistent_error_notification(
    tmp_path: Path,
) -> None:
    output = tmp_path / "output"
    settings = Settings(
        _env_file=None,
        output_dir=output,
        keyframe_workflow_profile=None,
        keyframe_guide_workflow_profile=None,
        video_workflow_profile=None,
    )
    manager = JobManager(lambda: settings, lambda: AssetStore(output))
    payload = shot_payload()

    job = await manager.start(payload, "all", False)
    await _wait_for_tasks(manager)

    notifications = cast(
        list[dict[str, Any]],
        StudioNotificationLog(output).listing()["notifications"],
    )
    item = notifications[0]
    assert job.status == "FAILED"
    assert item["level"] == "error"
    assert item["title"] == "Échec de génération du plan"
    assert item["source"] == "shot-job"
    assert item["context"]["job_id"] == job.id
    assert item["context"]["shot_id"] == "S01E001-S01"


async def test_successful_shot_job_publishes_persistent_success_notification(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeComfyClient:
        def __init__(self, *_args: object, **_kwargs: object) -> None:
            pass

        async def __aenter__(self) -> "FakeComfyClient":
            return self

        async def __aexit__(self, *_args: object) -> None:
            return None

    class FakePipeline:
        def __init__(
            self,
            _client: object,
            on_progress: Callable[[str, str, str], None],
        ) -> None:
            self.on_progress = on_progress

        async def run(self, _options: object) -> object:
            self.on_progress("artifacts", "completed", "Artefacts prêts")
            status = type("Status", (), {"value": "GENERATED"})()
            return type("Record", (), {"status": status})()

    output = tmp_path / "output"
    profile = tmp_path / "profile.json"
    profile.write_text("{}", encoding="utf-8")
    settings = Settings(
        _env_file=None,
        output_dir=output,
        keyframe_workflow_profile=profile,
        keyframe_guide_workflow_profile=profile,
        video_workflow_profile=profile,
    )
    monkeypatch.setattr("apps.api.job_manager.ComfyClient", FakeComfyClient)
    monkeypatch.setattr("apps.api.job_manager.ShotPipeline", FakePipeline)
    manager = JobManager(lambda: settings, lambda: AssetStore(output))
    payload = shot_payload()

    job = await manager.start(payload, "all", False)
    await _wait_for_tasks(manager)

    notifications = cast(
        list[dict[str, Any]],
        StudioNotificationLog(output).listing()["notifications"],
    )
    item = notifications[0]
    assert job.status == "GENERATED"
    assert item["level"] == "success"
    assert item["title"] == "Plan généré"
    assert item["context"]["status"] == "GENERATED"


async def _wait_for_tasks(manager: JobManager) -> None:
    while manager._tasks:
        await next(iter(manager._tasks))
