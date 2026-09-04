import copy
import json
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, cast

from apps.api.notifications import StudioNotificationLog
from apps.api.stage_actions import ShotStageService
from engine.audio.models import VoicePreset
from engine.config import Settings


class FakeSpeech:
    name = "fake-speech"
    output_suffix = ".wav"

    def synthesize(self, text: str, destination: Path, preset: VoicePreset) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes((text + f"|rate={preset.rate}").encode())


def shot_payload() -> dict[str, object]:
    payload = json.loads(Path("examples/shot.json").read_text(encoding="utf-8"))
    payload["dialogue"] = {
        "speaker": "belladone",
        "text": "Tu comptais me le dire ?",
        "performance": {
            "intention": "obtenir une réponse",
            "emotion": "espoir retenu",
            "pace": -0.5,
        },
    }
    return cast(dict[str, object], payload)


def test_prompt_and_voice_are_independently_generated(tmp_path: Path) -> None:
    settings = Settings(
        _env_file=None,
        output_dir=tmp_path / "output",
        private_content_dir=tmp_path / "private",
    )
    service = ShotStageService(
        lambda: settings,
        speech_factory=lambda _mode: FakeSpeech(),
    )

    prompt = service.generate("prompt", shot_payload())
    voice = service.generate("voice", shot_payload())

    destination = settings.output_dir / "S01E001-S01"
    assert prompt["stage"] == "prompt"
    assert "CHARACTERS" in (destination / "prompt.txt").read_text(encoding="utf-8")
    assert voice["media"] == {"audio": "/api/media/S01E001-S01/voice.wav"}
    assert (destination / "voice.wav").read_bytes().endswith(b"rate=-2")
    events = (destination / "studio-log.jsonl").read_text(encoding="utf-8")
    assert '"stage": "prompt"' in events
    assert '"stage": "voice"' in events
    listing = StudioNotificationLog(settings.output_dir).listing()
    notifications = cast(list[dict[str, Any]], listing["notifications"])
    assert [item["level"] for item in notifications] == [
        "success",
        "success",
    ]


def test_failed_stage_is_logged_and_published_as_notification(tmp_path: Path) -> None:
    settings = Settings(_env_file=None, output_dir=tmp_path / "output")
    service = ShotStageService(lambda: settings)
    payload = copy.deepcopy(shot_payload())
    payload.pop("dialogue")

    try:
        service.generate("voice", payload)
    except ValueError as exc:
        assert "aucune réplique" in str(exc)
    else:
        raise AssertionError("voice generation should have failed")

    notifications = cast(
        list[dict[str, Any]],
        StudioNotificationLog(settings.output_dir).listing()["notifications"],
    )
    event = notifications[0]
    assert event["level"] == "error"
    assert event["source"] == "shot-stage"
    assert event["context"] == {"shot_id": "S01E001-S01", "stage": "voice"}
    log = (settings.output_dir / "S01E001-S01" / "studio-log.jsonl").read_text(
        encoding="utf-8"
    )
    assert '"status": "failed"' in log


def test_stage_uses_one_project_settings_snapshot(tmp_path: Path) -> None:
    first = Settings(_env_file=None, output_dir=tmp_path / "first")
    second = Settings(_env_file=None, output_dir=tmp_path / "second")
    settings = iter((first, second))
    service = ShotStageService(lambda: next(settings))

    service.generate("prompt", shot_payload())

    assert (first.output_dir / "S01E001-S01" / "prompt.txt").is_file()
    assert not second.output_dir.exists()


def test_stage_reports_an_active_operation_during_settings_resolution(
    tmp_path: Path,
) -> None:
    entered = threading.Event()
    release = threading.Event()
    settings = Settings(_env_file=None, output_dir=tmp_path / "output")

    def provider() -> Settings:
        entered.set()
        assert release.wait(timeout=2)
        return settings

    service = ShotStageService(provider)
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(service.generate, "prompt", shot_payload())
        assert entered.wait(timeout=2)
        assert service.has_active_operations() is True
        release.set()
        future.result(timeout=2)

    assert service.has_active_operations() is False
