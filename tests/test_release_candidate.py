from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from pathlib import Path

import pytest
from PIL import Image

from engine.media.ffmpeg import FFmpegToolchain
from engine.production.release import (
    RELEASE_FILENAMES,
    ReleaseCandidateCommand,
    ReleaseCandidateCreate,
    ReleaseCandidateService,
)
from engine.world.catalog import EpisodeCatalog

EPISODE_ID = "S01E001"
SHOT_ID = "S01E001-S01"


def _probe(
    *,
    width: int = 576,
    height: int = 1024,
    duration: float = 50,
    video_codec: str = "h264",
    audio_codec: str = "aac",
) -> dict[str, object]:
    return {
        "format": {
            "duration": f"{duration:.6f}",
            "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
        },
        "streams": [
            {
                "codec_type": "video",
                "codec_name": video_codec,
                "width": width,
                "height": height,
                "avg_frame_rate": "24/1",
            },
            *(
                [{"codec_type": "audio", "codec_name": audio_codec}]
                if audio_codec
                else []
            ),
        ],
    }


def _seed_sources(tmp_path: Path) -> tuple[Path, Path]:
    private = tmp_path / "private"
    output = tmp_path / "output"
    shutil.copytree(Path("starter_catalog"), private)
    episode_output = output / EPISODE_ID
    episode_output.mkdir(parents=True)
    (episode_output / "episode-generation.json").write_text(
        json.dumps({"schema_version": 1, "status": "FINAL"}),
        encoding="utf-8",
    )
    (episode_output / "subtitles.fr.srt").write_text(
        "1\n00:00:01,000 --> 00:00:03,000\nA secret wakes in the greenhouse.\n",
        encoding="utf-8",
    )
    keyframe = output / SHOT_ID / "keyframe.png"
    keyframe.parent.mkdir(parents=True)
    Image.new("RGB", (64, 96), "#512447").save(keyframe)
    return private, output


def _write_real_master(
    path: Path,
    *,
    color: str = "0x201126",
    width: int = 576,
    height: int = 1024,
) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        pytest.skip("FFmpeg is required for the real release-media integration test")
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(  # noqa: S603
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"color=c={color}:s={width}x{height}:r=24:d=50",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=48000:cl=stereo",
            "-t",
            "50",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-crf",
            "51",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "32k",
            "-shortest",
            str(path),
        ],
        check=True,
    )


def _digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_release_rejects_empty_master(tmp_path: Path) -> None:
    private, output = _seed_sources(tmp_path)
    master = output / EPISODE_ID / "episode.mp4"
    master.write_bytes(b"")
    service = ReleaseCandidateService(EpisodeCatalog(private), output, probe=lambda _: _probe())

    with pytest.raises(ValueError, match="empty"):
        service.create_or_refresh(EPISODE_ID, ReleaseCandidateCreate())



@pytest.mark.parametrize(
    ("probe", "message"),
    [
        (_probe(width=576, height=1000), "supported 9:16 resolution"),
        (_probe(video_codec="vp9"), "codec"),
        (_probe(audio_codec=""), "audio stream"),
        (_probe(duration=29), "30-60s"),
    ],
)
def test_release_rejects_invalid_source_technical_properties(
    tmp_path: Path,
    probe: dict[str, object],
    message: str,
) -> None:
    private, output = _seed_sources(tmp_path)
    master = output / EPISODE_ID / "episode.mp4"
    master.write_bytes(b"renamed-placeholder")
    invalid = ReleaseCandidateService(
        EpisodeCatalog(private),
        output,
        probe=lambda _: probe,
        renderer=lambda source, destination, profile: pytest.fail(
            "Invalid sources must be rejected before release rendering"
        ),
    )
    with pytest.raises(ValueError, match=message):
        invalid.create_or_refresh(EPISODE_ID, ReleaseCandidateCreate())


def test_real_ffmpeg_release_is_immutable_and_stale_sources_require_reapproval(
    tmp_path: Path,
) -> None:
    private, output = _seed_sources(tmp_path)
    master = output / EPISODE_ID / "episode.mp4"
    _write_real_master(master)
    service = ReleaseCandidateService(EpisodeCatalog(private), output)

    candidate = service.create_or_refresh(
        EPISODE_ID,
        ReleaseCandidateCreate(cover_shot_id=SHOT_ID),
    )

    assert candidate.state == "draft"
    assert candidate.source.width == 576
    assert candidate.source.height == 1024
    assert candidate.source.fps == pytest.approx(24)
    assert candidate.source.duration == pytest.approx(50, abs=0.1)
    assert candidate.reel.width == 1080
    assert candidate.reel.height == 1920
    assert candidate.reel.fps == pytest.approx(24)
    assert candidate.reel.video_codec == "h264"
    assert candidate.reel.audio_codec
    assert candidate.render_profile.safe_area.model_dump() == {
        "unit": "px",
        "top": 240,
        "right": 180,
        "bottom": 420,
        "left": 90,
    }
    with pytest.raises(PermissionError, match="Human approval"):
        service.export(
            EPISODE_ID,
            ReleaseCandidateCommand(expected_revision=candidate.revision),
        )

    approved = service.approve(
        EPISODE_ID,
        ReleaseCandidateCommand(expected_revision=candidate.revision),
    )
    first = service.export(
        EPISODE_ID,
        ReleaseCandidateCommand(expected_revision=approved.revision),
    )
    assert first.export is not None
    first_directory = Path(first.export.path)
    assert {path.name for path in first_directory.iterdir()} == RELEASE_FILENAMES
    assert all(path.stat().st_size > 0 for path in first_directory.iterdir())
    release_payload = json.loads(
        (first_directory / "release.json").read_text(encoding="utf-8")
    )
    assert release_payload["render_profile"]["width"] == 1080
    assert release_payload["render_profile"]["height"] == 1920
    assert release_payload["render_profile"]["safe_area"]["bottom"] == 420
    exported_probe = FFmpegToolchain().probe(first_directory / "reel.mp4")
    exported_video = next(
        stream
        for stream in exported_probe["streams"]
        if stream["codec_type"] == "video"
    )
    exported_audio = next(
        stream
        for stream in exported_probe["streams"]
        if stream["codec_type"] == "audio"
    )
    assert exported_video["width"] == 1080
    assert exported_video["height"] == 1920
    assert exported_video["codec_name"] == "h264"
    assert exported_audio["codec_name"]
    first_hashes = {path.name: _digest(path) for path in first_directory.iterdir()}

    manifest = output / EPISODE_ID / "episode-generation.json"
    manifest.write_text(
        json.dumps({"schema_version": 1, "status": "FINAL", "revision": 2}),
        encoding="utf-8",
    )
    stale = service.get(EPISODE_ID)
    assert stale.state == "stale"
    assert stale.stale_reasons == ["manifest_changed"]
    with pytest.raises(PermissionError, match="Refresh stale"):
        service.approve(
            EPISODE_ID,
            ReleaseCandidateCommand(expected_revision=stale.revision),
        )

    refreshed = service.create_or_refresh(EPISODE_ID, ReleaseCandidateCreate())
    reapproved = service.approve(
        EPISODE_ID,
        ReleaseCandidateCommand(expected_revision=refreshed.revision),
    )
    second = service.export(
        EPISODE_ID,
        ReleaseCandidateCommand(expected_revision=reapproved.revision),
    )
    assert second.export is not None
    assert second.export.id != first.export.id
    assert Path(second.export.path) != first_directory
    assert first_directory.is_dir()
    assert {path.name: _digest(path) for path in first_directory.iterdir()} == first_hashes
    assert {item.filename for item in second.export.files} == RELEASE_FILENAMES
