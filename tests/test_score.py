import wave
from pathlib import Path

from engine.audio.score import ProceduralScoreComposer


def test_score_composer_writes_deterministic_stereo_wave(tmp_path: Path) -> None:
    first = tmp_path / "first.wav"
    second = tmp_path / "second.wav"
    composer = ProceduralScoreComposer()

    composer.compose(first, 0.25, seed=42)
    composer.compose(second, 0.25, seed=42)

    assert first.read_bytes() == second.read_bytes()
    with wave.open(str(first), "rb") as audio:
        assert audio.getnchannels() == 2
        assert audio.getframerate() == 48_000
        assert audio.getnframes() == 12_000
