from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import wave
from array import array
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import Protocol

from engine.audio.models import VoicePreset
from engine.director.models import DialoguePerformance

ProcessRunner = Callable[..., subprocess.CompletedProcess[str]]


class SpeechSynthesizer(Protocol):
    name: str
    output_suffix: str

    def synthesize(self, text: str, destination: Path, preset: VoicePreset) -> None: ...


class WindowsSapiSpeechSynthesizer:
    """Offline speech synthesis through the voices installed in Windows."""

    name = "windows-sapi"
    output_suffix = ".wav"

    _SCRIPT = ";".join(
        [
            "$ErrorActionPreference='Stop'",
            "Add-Type -AssemblyName System.Speech",
            (
                "$p=Get-Content -Raw -Encoding UTF8 "
                "-LiteralPath $env:SERRE_TTS_REQUEST | ConvertFrom-Json"
            ),
            "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer",
            (
                "if ($null -ne $p.voice -and [string]$p.voice -ne '') "
                "{$s.SelectVoice([string]$p.voice)}"
            ),
            "$s.Rate=[int]$p.rate",
            "$s.Volume=[int]$p.volume",
            "$s.SetOutputToWaveFile([string]$p.output)",
            "$escaped=[System.Security.SecurityElement]::Escape([string]$p.text)",
            (
                "$escaped=$escaped.Replace([string][char]0x2026, "
                "'<break time=\"350ms\"/>')"
            ),
            "$ratePercent=[int]$p.rate*5",
            "$pitchHz=[int]$p.pitch_hz",
            (
                "$ssml=\"<speak version='1.0' xml:lang='fr-FR'>"
                "<prosody rate='$($ratePercent)%' pitch='$($pitchHz)Hz'>"
                "$escaped</prosody></speak>\""
            ),
            "$s.SpeakSsml($ssml)",
            "$s.Dispose()",
        ]
    )

    def __init__(
        self,
        binary: str | Path | None = None,
        *,
        runner: ProcessRunner = subprocess.run,
    ) -> None:
        resolved = str(binary) if binary else shutil.which("powershell.exe")
        if not resolved:
            raise RuntimeError(
                "Windows PowerShell est introuvable. Importe les voix manuellement ou "
                "utilise ce backend sur Windows."
            )
        self.binary = resolved
        self._runner = runner

    def synthesize(self, text: str, destination: Path, preset: VoicePreset) -> None:
        if not text.strip():
            raise ValueError("Le texte de synthèse vocale est vide")
        destination.parent.mkdir(parents=True, exist_ok=True)
        request_path = destination.with_suffix(destination.suffix + ".request.json")
        request_path.write_text(
            json.dumps(
                {
                    "text": text,
                    "output": str(destination.resolve()),
                    "voice": preset.voice,
                    "rate": preset.rate,
                    "volume": preset.volume,
                    "pitch_hz": preset.pitch_hz,
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        environment = {**os.environ, "SERRE_TTS_REQUEST": str(request_path.resolve())}
        arguments: Sequence[str] = (
            self.binary,
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            self._SCRIPT,
        )
        try:
            completed = self._runner(
                arguments,
                check=False,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=environment,
            )
        finally:
            request_path.unlink(missing_ok=True)
        if completed.returncode != 0:
            detail = (completed.stderr or completed.stdout or "erreur SAPI inconnue").strip()
            raise RuntimeError(f"La synthèse vocale SAPI a échoué : {detail[-1200:]}")
        if not destination.is_file() or destination.stat().st_size == 0:
            raise RuntimeError("La synthèse vocale SAPI n'a produit aucun fichier audio")
        _trim_pcm_silence(destination)


class EdgeNeuralSpeechSynthesizer:
    """Optional neural backend; it is selected only by an explicit ``--tts edge``."""

    name = "edge-neural"
    output_suffix = ".mp3"

    def __init__(
        self,
        binary: str | Path | None = None,
        *,
        runner: ProcessRunner = subprocess.run,
    ) -> None:
        resolved = str(binary) if binary else shutil.which("edge-tts")
        if not resolved:
            raise RuntimeError(
                "edge-tts est introuvable. Installe l'extra voice ou sélectionne SAPI."
            )
        self.binary = resolved
        self._runner = runner

    def synthesize(self, text: str, destination: Path, preset: VoicePreset) -> None:
        if not text.strip():
            raise ValueError("Le texte de synthèse vocale est vide")
        destination.parent.mkdir(parents=True, exist_ok=True)
        voice = preset.voice or "fr-FR-VivienneMultilingualNeural"
        arguments: Sequence[str] = (
            self.binary,
            "--voice",
            voice,
            f"--rate={preset.rate * 5:+d}%",
            f"--volume={preset.volume - 100:+d}%",
            f"--pitch={preset.pitch_hz:+d}Hz",
            "--text",
            text,
            "--write-media",
            str(destination),
        )
        completed = self._runner(
            arguments,
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if completed.returncode != 0:
            detail = (completed.stderr or completed.stdout or "erreur Edge TTS inconnue").strip()
            raise RuntimeError(f"La synthèse vocale neuronale a échoué : {detail[-1200:]}")
        if not destination.is_file() or destination.stat().st_size == 0:
            raise RuntimeError("La synthèse vocale neuronale n'a produit aucun fichier audio")


def create_speech_synthesizer(mode: str) -> SpeechSynthesizer | None:
    if mode == "none":
        return None
    if mode == "edge":
        return EdgeNeuralSpeechSynthesizer()
    if mode == "sapi" or (mode == "auto" and sys.platform == "win32"):
        return WindowsSapiSpeechSynthesizer()
    return None


def voice_preset_for_performance(
    preset: VoicePreset,
    performance: DialoguePerformance | None,
) -> VoicePreset:
    if performance is None:
        return preset
    return preset.model_copy(
        update={
            "rate": min(10, max(-10, preset.rate + round(performance.pace * 4))),
            "pitch_hz": min(
                100,
                max(-100, preset.pitch_hz + round(performance.pitch * 40)),
            ),
            "volume": min(
                100,
                max(0, preset.volume + round(performance.volume * 15)),
            ),
        }
    )


def _trim_pcm_silence(path: Path, *, margin_seconds: float = 0.08) -> None:
    """Remove SAPI's variable edge silence while preserving pauses inside a line."""
    try:
        with wave.open(str(path), "rb") as source:
            params = source.getparams()
            if params.sampwidth != 2 or params.nframes == 0:
                return
            content = source.readframes(params.nframes)
    except (EOFError, wave.Error):
        return
    samples = array("h")
    samples.frombytes(content)
    if sys.byteorder != "little":
        samples.byteswap()
    channels = params.nchannels
    frame_count = len(samples) // channels
    peak = max((abs(sample) for sample in samples), default=0)
    if peak == 0:
        return
    threshold = max(96, int(peak * 0.012))

    def audible(frame: int) -> bool:
        start = frame * channels
        return any(abs(samples[start + channel]) > threshold for channel in range(channels))

    first = next((frame for frame in range(frame_count) if audible(frame)), None)
    if first is None:
        return
    last = next(frame for frame in range(frame_count - 1, -1, -1) if audible(frame))
    margin = round(params.framerate * margin_seconds)
    start_frame = max(0, first - margin)
    end_frame = min(frame_count, last + margin + 1)
    if start_frame == 0 and end_frame == frame_count:
        return
    trimmed = samples[start_frame * channels : end_frame * channels]
    if sys.byteorder != "little":
        trimmed.byteswap()
    temporary = path.with_suffix(path.suffix + ".trimmed")
    with wave.open(str(temporary), "wb") as destination:
        destination.setparams(params)
        destination.writeframes(trimmed.tobytes())
    temporary.replace(path)
