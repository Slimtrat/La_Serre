from __future__ import annotations

import json
import subprocess
from collections.abc import Sequence
from os import PathLike
from pathlib import Path

from engine.audio.models import VoicePreset
from engine.audio.speech import EdgeNeuralSpeechSynthesizer, WindowsSapiSpeechSynthesizer


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
        "pitch_hz": 0,
    }
    arguments = seen["args"]
    assert isinstance(arguments, Sequence)
    assert "apostrophes" not in " ".join(str(item) for item in arguments)
    assert not destination.with_suffix(".wav.request.json").exists()


def test_edge_tts_passes_text_as_a_safe_process_argument(tmp_path: Path) -> None:
    seen: dict[str, object] = {}

    def fake_runner(
        args: Sequence[str | bytes | PathLike[str] | PathLike[bytes]],
        **kwargs: object,
    ) -> subprocess.CompletedProcess[str]:
        Path(str(args[-1])).write_bytes(b"neural-mp3")
        seen["args"] = args
        return subprocess.CompletedProcess(args, 0, "", "")

    destination = tmp_path / "voice.mp3"
    synthesizer = EdgeNeuralSpeechSynthesizer("edge-tts", runner=fake_runner)
    synthesizer.synthesize(
        "Moi aussi. Présente-nous.",
        destination,
        VoicePreset(
            backend="edge",
            voice="fr-FR-VivienneMultilingualNeural",
            rate=2,
            volume=94,
            pitch_hz=-4,
        ),
    )

    assert destination.read_bytes() == b"neural-mp3"
    raw_arguments = seen["args"]
    assert isinstance(raw_arguments, Sequence)
    arguments = [str(item) for item in raw_arguments]
    assert "--rate=+10%" in arguments
    assert "--volume=-6%" in arguments
    assert "--pitch=-4Hz" in arguments
    assert "Moi aussi. Présente-nous." in arguments
