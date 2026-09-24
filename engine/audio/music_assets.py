"""Licensed episode music, whether generated locally or imported."""

from __future__ import annotations

import json
import shutil
import subprocess
import wave
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field

from engine.audio.ace_step import AceStepClient
from engine.audio.score import ProceduralScoreComposer
from engine.production.artifacts import sha256_file, write_text_atomic
from engine.runtime.installers.ffmpeg import resolve_managed_ffmpeg


class AudioNormalizer(Protocol):
    def normalize(self, source: Path, destination: Path) -> None: ...


class AudioNormalizerUnavailableError(RuntimeError):
    """Raised when the configured audio normalizer cannot be started."""


class FFmpegAudioNormalizer:
    def __init__(self, executable: str | Path | None = None) -> None:
        self.executable = executable

    def normalize(self, source: Path, destination: Path) -> None:
        executable = self._resolve_executable()
        try:
            completed = subprocess.run(
                [
                    executable,
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-nostdin",
                    "-y",
                    "-i",
                    str(source),
                    "-vn",
                    "-ar",
                    "48000",
                    "-ac",
                    "2",
                    "-c:a",
                    "pcm_s16le",
                    str(destination),
                ],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                check=False,
            )
        except OSError as exc:
            raise AudioNormalizerUnavailableError(
                "FFmpeg est introuvable. Installe le pack FFmpeg dans Réglages."
            ) from exc
        if completed.returncode != 0 or not destination.is_file():
            detail = (completed.stderr or completed.stdout or "erreur inconnue").strip()
            raise ValueError(f"FFmpeg n'a pas pu importer la piste : {detail[-500:]}")

    def _resolve_executable(self) -> str:
        if self.executable is not None:
            return str(self.executable)
        managed = resolve_managed_ffmpeg(Path.cwd() / ".la-serre-runtime")
        if managed is not None:
            return str(managed[0])
        executable = shutil.which("ffmpeg")
        if executable is None:
            raise AudioNormalizerUnavailableError(
                "FFmpeg est introuvable. Installe le pack FFmpeg dans Réglages."
            )
        return executable


class MusicRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1] = 1
    source: Literal["ace-step-1.5", "imported", "procedural"]
    filename: str = "music.wav"
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    license_id: str = Field(min_length=1)
    source_label: str = Field(min_length=1)
    commercial_rights_confirmed: bool
    prompt: str | None = None
    seed: int | None = None
    provider_task_id: str | None = None
    created_at: datetime


class EpisodeMusicStore:
    def __init__(
        self,
        output_root: Path,
        normalizer: AudioNormalizer | None = None,
    ) -> None:
        self.output_root = output_root
        self.normalizer = normalizer or FFmpegAudioNormalizer()

    def track(self, episode_id: str) -> Path:
        self._validate_id(episode_id)
        return self.output_root / episode_id / "music.wav"

    def record_path(self, episode_id: str) -> Path:
        self._validate_id(episode_id)
        return self.output_root / episode_id / "music-source.json"

    def load(self, episode_id: str) -> MusicRecord | None:
        path = self.record_path(episode_id)
        if not path.is_file():
            return None
        return MusicRecord.model_validate_json(path.read_text(encoding="utf-8"))

    def generate(
        self,
        episode_id: str,
        *,
        prompt: str,
        duration: float,
        seed: int,
        client: AceStepClient,
        force: bool = False,
    ) -> MusicRecord:
        destination = self.track(episode_id)
        self._check_replace(destination, force)
        candidate = destination.with_name("music-candidate.wav")
        if candidate.exists():
            raise FileExistsError("Une piste candidate existe déjà ; termine ou retire-la d'abord")
        try:
            task_id = client.generate(
                prompt=prompt, duration=duration, destination=candidate, seed=seed
            )
            record = self._record(
                candidate,
                source="ace-step-1.5",
                license_id="MIT",
                source_label="ACE-Step/Ace-Step1.5, acestep-v15-turbo",
                commercial_rights_confirmed=True,
                prompt=prompt,
                seed=seed,
                provider_task_id=task_id,
            )
            candidate.replace(destination)
            self._save_record(episode_id, record)
            return record
        finally:
            candidate.unlink(missing_ok=True)

    def compose(
        self,
        episode_id: str,
        *,
        duration: float,
        seed: int,
        composer: ProceduralScoreComposer | None = None,
        force: bool = False,
    ) -> MusicRecord:
        destination = self.track(episode_id)
        self._check_replace(destination, force)
        candidate = destination.with_name("music-candidate.wav")
        if candidate.exists():
            raise FileExistsError("Une piste candidate existe déjà ; termine ou retire-la d'abord")
        try:
            (composer or ProceduralScoreComposer()).compose(candidate, duration, seed=seed)
            record = self._record(
                candidate,
                source="procedural",
                license_id="AGPL-3.0-or-later",
                source_label="La Serre, ProceduralScoreComposer",
                commercial_rights_confirmed=True,
                seed=seed,
            )
            candidate.replace(destination)
            self._save_record(episode_id, record)
            return record
        finally:
            candidate.unlink(missing_ok=True)

    def import_track(
        self,
        episode_id: str,
        source: Path,
        *,
        license_id: str,
        rights_confirmed: bool,
        force: bool = False,
    ) -> MusicRecord:
        if not rights_confirmed:
            raise ValueError("Confirme les droits commerciaux de la piste importée")
        if not license_id.strip():
            raise ValueError("Indique la licence ou l'origine de la piste importée")
        extensions = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}
        if not source.is_file() or source.suffix.lower() not in extensions:
            raise ValueError("Importe un fichier audio WAV, MP3, FLAC, OGG ou M4A")
        destination = self.track(episode_id)
        self._check_replace(destination, force)
        destination.parent.mkdir(parents=True, exist_ok=True)
        candidate = destination.with_name("music-candidate.wav")
        if candidate.exists():
            raise FileExistsError("Une piste candidate existe déjà ; termine ou retire-la d'abord")
        try:
            self.normalizer.normalize(source, candidate)
            with wave.open(str(candidate), "rb") as reader:
                if reader.getnframes() == 0:
                    raise ValueError("La piste importée est vide")
            record = self._record(
                candidate,
                source="imported",
                license_id=license_id.strip(),
                source_label=source.name,
                commercial_rights_confirmed=True,
            )
            candidate.replace(destination)
            self._save_record(episode_id, record)
            return record
        finally:
            candidate.unlink(missing_ok=True)

    @staticmethod
    def _validate_id(episode_id: str) -> None:
        import re

        if not re.fullmatch(r"S\d{2}E\d{3}", episode_id):
            raise ValueError("Identifiant d'épisode invalide")

    @staticmethod
    def _check_replace(path: Path, force: bool) -> None:
        if path.exists() and not force:
            raise FileExistsError("Une musique existe déjà ; confirme son remplacement")

    @staticmethod
    def _record(path: Path, **metadata: object) -> MusicRecord:
        return MusicRecord(
            sha256=sha256_file(path),
            created_at=datetime.now(UTC),
            **metadata,
        )

    def _save_record(self, episode_id: str, record: MusicRecord) -> None:
        write_text_atomic(
            self.record_path(episode_id),
            json.dumps(record.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n",
        )
