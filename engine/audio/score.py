from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path


class ProceduralScoreComposer:
    """Creates a deterministic dark botanical waltz without network services."""

    name = "procedural-dark-waltz"
    sample_rate = 48_000
    bpm = 96

    def compose(self, destination: Path, duration: float, *, seed: int = 0) -> None:
        if duration <= 0:
            raise ValueError("La durée de la musique doit être positive")
        destination.parent.mkdir(parents=True, exist_ok=True)
        total_frames = round(duration * self.sample_rate)
        beat_seconds = 60 / self.bpm
        roots = (73.42, 65.41, 58.27, 65.41)  # D2, C2, Bb1, C2
        thirds = (174.61, 164.81, 146.83, 164.81)  # F3, E3, D3, E3
        fifths = (220.00, 196.00, 174.61, 196.00)  # A3, G3, F3, G3
        rng = random.Random(seed)
        air = [rng.uniform(-1, 1) for _ in range(4096)]

        with wave.open(str(destination), "wb") as output:
            output.setnchannels(2)
            output.setsampwidth(2)
            output.setframerate(self.sample_rate)
            chunk = bytearray()
            for frame in range(total_frames):
                time = frame / self.sample_rate
                beat = int(time / beat_seconds)
                measure = beat // 3
                beat_phase = (time % beat_seconds) / beat_seconds
                measure_phase = (time % (beat_seconds * 3)) / (beat_seconds * 3)
                chord = measure % len(roots)

                pad = 0.055 * math.sin(2 * math.pi * roots[chord] * time)
                pad += 0.035 * math.sin(2 * math.pi * thirds[chord] * time + 0.4)
                pad += 0.025 * math.sin(2 * math.pi * fifths[chord] * time + 0.9)

                pluck_frequency = (roots[chord] * 2, thirds[chord], fifths[chord])[beat % 3]
                pluck_envelope = math.exp(-5.5 * beat_phase)
                pluck = 0.11 * pluck_envelope * math.sin(
                    2 * math.pi * pluck_frequency * time
                )
                pluck += 0.035 * pluck_envelope * math.sin(
                    2 * math.pi * pluck_frequency * 2.01 * time
                )

                pulse_phase = measure_phase * 3
                pulse = 0.10 * math.exp(-16 * pulse_phase) * math.sin(
                    2 * math.pi * 49 * time
                )
                breath = 0.006 * air[frame % len(air)] * (
                    0.5 + 0.5 * math.sin(2 * math.pi * 0.11 * time)
                )
                shimmer = 0.018 * math.sin(2 * math.pi * 523.25 * time + 0.6) * (
                    pluck_envelope if beat % 6 == 5 else 0
                )

                left = self._pcm(pad + pluck + pulse + breath + shimmer)
                right = self._pcm(pad * 0.96 + pluck * 0.88 + pulse + breath - shimmer)
                chunk.extend(struct.pack("<hh", left, right))
                if len(chunk) >= 65_536:
                    output.writeframesraw(chunk)
                    chunk.clear()
            if chunk:
                output.writeframesraw(chunk)

    @staticmethod
    def _pcm(value: float) -> int:
        return round(max(-0.98, min(0.98, value)) * 32767)
