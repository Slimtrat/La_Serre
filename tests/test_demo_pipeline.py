from __future__ import annotations

import shutil
from collections.abc import Sequence
from pathlib import Path

import pytest

from apps.api.demo_pipeline import DemoPipeline


def fake_video(command: Sequence[str]) -> None:
    Path(command[-1]).write_bytes(b"demo-video")


def pipeline(tmp_path: Path) -> DemoPipeline:
    return DemoPipeline(
        lambda: tmp_path,
        ffmpeg_resolver=lambda: "ffmpeg",
        command_runner=fake_video,
    )


def test_demo_pipeline_requires_human_approval_between_every_stage(
    tmp_path: Path,
) -> None:
    demo = pipeline(tmp_path)

    with pytest.raises(ValueError, match="étape précédente"):
        demo.imagine("plan")

    state = demo.imagine("story", instruction="Une fleur vole une ombre")
    assert state["stages"][0]["status"] == "generated"
    assert state["stages"][0]["provenance"]["real_ai"] is False
    assert state["stages"][1]["status"] == "locked"

    state = demo.approve("story")
    assert state["stages"][0]["status"] == "approved"
    assert state["stages"][1]["status"] == "ready"


def test_demo_pipeline_preserves_external_ai_content_and_provenance(tmp_path: Path) -> None:
    demo = pipeline(tmp_path)
    content = "Belladone entend la graine lui murmurer le nom d’Aconit."
    provenance = {"provider": "ollama", "model": "tiny", "real_ai": True}

    state = demo.imagine(
        "story",
        generated_content=content,
        provenance=provenance,
    )

    stage = state["stages"][0]
    assert stage["content"] == content
    assert stage["provenance"] == provenance


def test_demo_pipeline_builds_three_frames_sound_subtitles_and_video(
    tmp_path: Path,
) -> None:
    demo = pipeline(tmp_path)

    for stage in ("story", "plan", "frames", "sound", "video"):
        state = demo.imagine(stage)
        assert next(item for item in state["stages"] if item["id"] == stage)[
            "status"
        ] == "generated"
        state = demo.approve(stage)

    assert state["complete"] is True
    assert demo.media_path("frame-1.bmp").read_bytes().startswith(b"BM")
    assert demo.media_path("ambience.wav").read_bytes().startswith(b"RIFF")
    assert demo.media_path("subtitles.srt").is_file()
    assert demo.media_path("demo.mp4").read_bytes() == b"demo-video"


def test_rejecting_an_upstream_stage_invalidates_and_removes_downstream_media(
    tmp_path: Path,
) -> None:
    demo = pipeline(tmp_path)
    for stage in ("story", "plan", "frames"):
        demo.imagine(stage)
        demo.approve(stage)

    assert demo.media_path("frame-1.bmp").is_file()
    state = demo.reject("plan", feedback="Plus de tension")

    plan = next(item for item in state["stages"] if item["id"] == "plan")
    frames = next(item for item in state["stages"] if item["id"] == "frames")
    assert plan["status"] == "rejected"
    assert plan["feedback"] == "Plus de tension"
    assert frames["status"] == "locked"
    assert not demo.media_path("frame-1.bmp").exists()


def test_demo_media_names_are_allowlisted(tmp_path: Path) -> None:
    demo = pipeline(tmp_path)
    with pytest.raises(FileNotFoundError):
        demo.media_path("../state.json")


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="FFmpeg is not installed")
def test_real_ffmpeg_produces_a_small_playable_mp4(tmp_path: Path) -> None:
    demo = DemoPipeline(lambda: tmp_path)

    for stage in ("story", "plan", "frames", "sound", "video"):
        demo.imagine(stage)
        demo.approve(stage)

    video = demo.media_path("demo.mp4")
    assert video.stat().st_size > 10_000
    assert b"ftyp" in video.read_bytes()[:32]
