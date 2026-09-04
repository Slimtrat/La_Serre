import json
from pathlib import Path

import pytest

from apps.api.run_history import RunHistory


def write_run(root: Path, generation_id: str, image: bytes) -> Path:
    destination = root / "S01E001-S01"
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "keyframe.png").write_bytes(image)
    (destination / "generation.json").write_text(
        json.dumps(
            {
                "id": generation_id,
                "status": "GENERATED",
                "created_at": "2026-09-04T00:00:00+00:00",
                "completed_at": "2026-09-04T00:01:00+00:00",
                "seed": 42,
            }
        ),
        encoding="utf-8",
    )
    return destination


def test_history_archives_and_restores_generated_run(tmp_path: Path) -> None:
    output = tmp_path / "output"
    current = write_run(output, "gen_first", b"first")
    history = RunHistory(output)
    log = history.job_log_path("job-first")
    history.append_event(
        log,
        {"timestamp": "now", "stage": "video", "status": "completed", "message": "ok"},
    )
    history.attach_job_log("job-first", "S01E001-S01")

    archived = history.archive_current("S01E001-S01")
    assert archived is not None
    assert archived["id"] == "gen_first"
    assert archived["events"][0]["stage"] == "video"

    write_run(output, "gen_second", b"second")
    restored = history.restore("S01E001-S01", "gen_first")

    assert restored["current"] is True
    assert (current / "keyframe.png").read_bytes() == b"first"
    runs = history.list_runs("S01E001-S01")
    assert runs[0]["id"] == "current"
    assert {run["id"] for run in runs[1:]} == {"gen_first", "gen_second"}


def test_history_rejects_unsafe_identifiers(tmp_path: Path) -> None:
    history = RunHistory(tmp_path)

    with pytest.raises(ValueError, match="Invalid shot id"):
        history.media_path("../../escape", "current", "keyframe.png")


def test_prompt_regeneration_archives_and_invalidates_dependent_outputs(
    tmp_path: Path,
) -> None:
    output = tmp_path / "output"
    current = write_run(output, "gen_first", b"start")
    for filename, content in (
        ("prompt.txt", b"old prompt"),
        ("keyframe-guide-1.png", b"middle"),
        ("keyframe-guide-2.png", b"end"),
        ("clip.mp4", b"clip"),
        ("voice.wav", b"voice"),
    ):
        (current / filename).write_bytes(content)
    episode = output / "S01E001"
    episode.mkdir()
    for filename in (
        "episode.mp4",
        "episode-generation.json",
        "subtitles.fr.srt",
        "music.wav",
    ):
        (episode / filename).write_bytes(filename.encode())

    archived = RunHistory(output).invalidate_shot_after("S01E001-S01", "prompt")

    assert archived == "gen_first"
    assert (current / "voice.wav").read_bytes() == b"voice"
    for filename in (
        "prompt.txt",
        "keyframe.png",
        "keyframe-guide-1.png",
        "keyframe-guide-2.png",
        "clip.mp4",
        "generation.json",
    ):
        assert not (current / filename).exists()
        assert (output / ".history" / "S01E001-S01" / "gen_first" / filename).is_file()
    assert (episode / "music.wav").is_file()
    assert not (episode / "episode.mp4").exists()
    master_archives = list((output / ".history" / "S01E001").iterdir())
    assert len(master_archives) == 1
    assert (master_archives[0] / "episode.mp4").is_file()
    assert (master_archives[0] / "music.wav").is_file()
