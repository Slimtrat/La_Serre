from pathlib import Path

from apps.api.job_manager import JobManager, StudioJob


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
