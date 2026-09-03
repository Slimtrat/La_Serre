import math
import struct
import wave
from pathlib import Path

from engine.audio.speech import _trim_pcm_silence


def test_trim_pcm_silence_keeps_internal_performance_pause(tmp_path: Path) -> None:
    sample_rate = 8000
    path = tmp_path / "voice.wav"
    tone = [round(math.sin(index / 8) * 5000) for index in range(sample_rate // 2)]
    edge = [0] * sample_rate
    internal = [0] * (sample_rate // 4)
    samples = edge + tone + internal + tone + edge
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        output.writeframes(struct.pack(f"<{len(samples)}h", *samples))

    _trim_pcm_silence(path, margin_seconds=0.05)

    with wave.open(str(path), "rb") as result:
        duration = result.getnframes() / result.getframerate()
    assert 1.3 < duration < 1.4
