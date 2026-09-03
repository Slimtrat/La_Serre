from __future__ import annotations

import json
import subprocess
from collections.abc import Sequence
from os import PathLike
from pathlib import Path

from engine.audio.models import VoicePreset
from engine.audio.speech import WindowsSapiSpeechSynthesizer


def test_sapi_passes_dialogue_through_a_json_request(tmp_path: Path) -> None:
    seen: dict[str, object] = {}

    def fake_runner(
        args: Sequence[str | bytes | PathLike[str] | PathLike[bytes]],
        **kwargs: object,
    ) -> subprocess.CompletedProcess[str]:
        environment = kwargs["env"]
        assert isinstance(environment, dict)
        request_path = Path(str(environment["SERRE_TTS_REQUEST"]))
        payload = json.loads(request_path.read_text(encoding="utf-8"))
        Path(payload["output"]).write_bytes(b"RIFF-generated")
        seen["args"] = args
        seen["payload"] = payload
        return subprocess.CompletedProcess(args, 0, "", "")

    destination = tmp_path / "voice.wav"
    synthesizer = WindowsSapiSpeechSynthesizer("powershell.exe", runner=fake_runner)
    synthesizer.synthesize(
        "J'aime les apostrophes ; rien ne doit s'exécuter.",
        destination,
        VoicePreset(voice="Voix française", rate=2, volume=87),
    )

    assert destination.read_bytes() == b"RIFF-generated"
    assert seen["payload"] == {
        "text": "J'aime les apostrophes ; rien ne doit s'exécuter.",
        "output": str(destination.resolve()),
        "voice": "Voix française",
        "rate": 2,
        "volume": 87,
    }
    arguments = seen["args"]
    assert isinstance(arguments, Sequence)
    assert "apostrophes" not in " ".join(str(item) for item in arguments)
    assert not destination.with_suffix(".wav.request.json").exists()
