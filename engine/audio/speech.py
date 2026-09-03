from __future__ import annotations

import json
import os
import shutil
import subprocess
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import Protocol

from engine.audio.models import VoicePreset

ProcessRunner = Callable[..., subprocess.CompletedProcess[str]]


class SpeechSynthesizer(Protocol):
    name: str

    def synthesize(self, text: str, destination: Path, preset: VoicePreset) -> None: ...


class WindowsSapiSpeechSynthesizer:
    """Offline speech synthesis through the voices installed in Windows."""

    name = "windows-sapi"

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
            "$s.Speak([string]$p.text)",
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
