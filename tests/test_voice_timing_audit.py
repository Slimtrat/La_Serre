import json
from pathlib import Path

from engine.audio.models import VoicePreset
from tools.audit_voice_timing import audit_proposal


class FakeSpeech:
    name = "fake"
    output_suffix = ".wav"

    def synthesize(self, text: str, destination: Path, preset: VoicePreset) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(text, encoding="utf-8")


class FakeMedia:
    def duration(self, path: Path) -> float:
        return 3.0 if "S01" in path.stem else 6.0


def test_audit_proposal_measures_required_dialogue_speed(tmp_path: Path) -> None:
    proposal = tmp_path / "proposal"
    shots = proposal / "shots"
    shots.mkdir(parents=True)
    (proposal / "audio-plan.json").write_text(
        json.dumps(
            {
                "cues": {"S01E001-S01": {"offset_seconds": 0.25}},
                "max_time_fit_speed": 1.5,
            }
        ),
        encoding="utf-8",
    )
    (shots / "S01E001-S01.json").write_text(
        json.dumps(
            {
                "id": "S01E001-S01",
                "duration": 2.5,
                "location": "room",
                "location_description": "room",
                "characters": [
                    {
                        "id": "belladone",
                        "name": "Belladone",
                        "emotion": "calme",
                        "position": "foreground",
                        "visual_description": "botanical face",
                        "wardrobe": "layered leaves",
                        "signature_details": ["black berries"],
                        "reference_images": [],
                    }
                ],
                "camera": {"shot_type": "close", "movement": "still", "lens": "50mm"},
                "action": "A character speaks.",
                "dialogue": {
                    "speaker": "belladone",
                    "text": "Une phrase suffisamment expressive.",
                    "performance": {
                        "intention": "tester",
                        "emotion": "calme",
                        "pause_before_seconds": 0.1,
                        "pause_after_seconds": 0.15,
                    },
                },
                "lighting": "soft",
                "mood": "tense",
                "style": ["stylized"],
                "render": {"seed": 1},
                "visual_beats": [],
            }
        ),
        encoding="utf-8",
    )

    records = audit_proposal(proposal, FakeSpeech(), FakeMedia(), tmp_path / "voices")

    assert records[0]["available_duration"] == 2.0
    assert records[0]["required_speed"] == 1.5
    assert records[0]["within_limit"] is True
