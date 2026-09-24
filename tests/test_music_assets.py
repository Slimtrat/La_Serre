from __future__ import annotations

import wave
from pathlib import Path

import pytest

from engine.audio.music_assets import (
    AudioNormalizerUnavailableError,
    EpisodeMusicStore,
    FFmpegAudioNormalizer,
)


class FakeAudioNormalizer:
    def normalize(self, source: Path, destination: Path) -> None:
        assert source.name == "source.wav"
        with wave.open(str(source), "rb") as input_audio:
            assert input_audio.getframerate() == 8_000
            assert input_audio.getnchannels() == 1
        with wave.open(str(destination), "wb") as output:
            output.setnchannels(2)
            output.setsampwidth(2)
            output.setframerate(48_000)
            output.writeframes(b"\0\0\0\0" * 48_000)


class FakeAceStep:
    def generate(
        self, *, prompt: str, duration: float, destination: Path, seed: int
    ) -> str:
        assert prompt == "Forêt nocturne, instrumental"
        assert duration == 12
        assert seed == 9
        destination.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(destination), "wb") as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(24_000)
            output.writeframes(b"\0\0" * 100)
        return "task-9"


def test_generated_track_has_verifiable_source_record(tmp_path: Path) -> None:
    store = EpisodeMusicStore(tmp_path)
    record = store.generate(
        "S01E001",
        prompt="Forêt nocturne, instrumental",
        duration=12,
        seed=9,
        client=FakeAceStep(),  # type: ignore[arg-type]
    )
    assert store.track("S01E001").is_file()
    assert store.load("S01E001") == record
    assert record.source == "ace-step-1.5"
    assert record.provider_task_id == "task-9"
    with pytest.raises(FileExistsError, match="remplacement"):
        store.generate(
            "S01E001",
            prompt="Forêt nocturne, instrumental",
            duration=12,
            seed=9,
            client=FakeAceStep(),  # type: ignore[arg-type]
        )


def test_import_requires_rights_and_normalizes_audio(tmp_path: Path) -> None:
    source = tmp_path / "source.wav"
    with wave.open(str(source), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(8_000)
        output.writeframes(b"\0\0" * 8_000)
    store = EpisodeMusicStore(tmp_path / "output", normalizer=FakeAudioNormalizer())
    with pytest.raises(ValueError, match="droits commerciaux"):
        store.import_track(
            "S01E002", source, license_id="Commande originale", rights_confirmed=False
        )
    record = store.import_track(
        "S01E002", source, license_id="Commande originale", rights_confirmed=True
    )
    with wave.open(str(store.track("S01E002")), "rb") as output:
        assert output.getframerate() == 48_000
        assert output.getnchannels() == 2
    assert record.source == "imported"
    assert record.source_label == "source.wav"


def test_import_reports_missing_ffmpeg_without_leaking_file_not_found(tmp_path: Path) -> None:
    source = tmp_path / "source.wav"
    source.write_bytes(b"RIFF")
    store = EpisodeMusicStore(
        tmp_path / "output",
        normalizer=FFmpegAudioNormalizer(tmp_path / "missing-ffmpeg"),
    )

    with pytest.raises(AudioNormalizerUnavailableError, match="FFmpeg est introuvable"):
        store.import_track(
            "S01E002", source, license_id="Commande originale", rights_confirmed=True
        )

    assert not store.track("S01E002").exists()


def test_episode_id_is_confined_to_its_output_directory(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="invalide"):
        EpisodeMusicStore(tmp_path).track("../../elsewhere")
