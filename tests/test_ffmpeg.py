from __future__ import annotations

from pathlib import Path

from engine.media.ffmpeg import AssemblyRequest, FFmpegToolchain, SegmentInput


def toolchain() -> FFmpegToolchain:
    result = object.__new__(FFmpegToolchain)
    result.ffmpeg = "ffmpeg"
    result.ffprobe = "ffprobe"
    return result


def test_ffmpeg_command_builds_timed_mix_and_soft_subtitles(tmp_path: Path) -> None:
    request = AssemblyRequest(
        segments=[
            SegmentInput(
                shot_id="S01E001-S01",
                visual=tmp_path / "keyframe.png",
                visual_kind="image",
                duration=4,
                overlay=tmp_path / "cadre-des-venins.png",
                caption="MINUIT : la serre respire.",
            ),
            SegmentInput(
                shot_id="S01E001-S02",
                visual=tmp_path / "clip.mp4",
                visual_kind="video",
                duration=5,
                audio=tmp_path / "dialogue.wav",
                audio_offset=0.5,
                audio_gain_db=-2,
            ),
        ],
        output=tmp_path / "episode.mp4",
        width=576,
        height=1024,
        fps=24,
        subtitles=tmp_path / "subtitles.fr.srt",
        music=tmp_path / "music.wav",
        ambience=tmp_path / "ambience.wav",
        caption_font=Path("C:/fonts/georgia.ttf"),
    )

    command = toolchain().build_command(request)
    rendered = " ".join(command)

    assert "-loop 1" in rendered
    assert "overlay=0:0" in rendered
    assert "drawtext=" in rendered
    assert "fontfile='C\\:/fonts/georgia.ttf'" in rendered
    assert "subtitles=filename=" in rendered
    assert "[episode_video_burned]" in rendered
    assert "-map [episode_video_burned]" in rendered
    assert r"MINUIT \: la serre respire." in rendered
    assert "concat=n=2:v=1:a=1" in rendered
    assert "adelay=500|500" in rendered
    assert "sidechaincompress" in rendered
    assert "amix=inputs=3" in rendered
    assert "-c:s mov_text" in rendered
    assert rendered.endswith(str(request.output))
