from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from engine.director.models import Shot


def test_example_shot_round_trips() -> None:
    path = Path("examples/shot.json")
    shot = Shot.model_validate_json(path.read_text(encoding="utf-8"))
    restored = Shot.model_validate_json(shot.model_dump_json())

    assert restored == shot
    assert shot.render.frames == 97


def test_frames_are_derived_with_ltx_constraint() -> None:
    data = json.loads(Path("examples/shot.json").read_text(encoding="utf-8"))
    data["render"]["frames"] = None

    shot = Shot.model_validate(data)

    assert shot.render.frames is not None
    assert (shot.render.frames - 1) % 8 == 0


def test_dialogue_accepts_actor_direction() -> None:
    data = json.loads(Path("examples/shot.json").read_text(encoding="utf-8"))
    data["dialogue"] = {
        "speaker": "belladone",
        "text": "Tu arrives tard.",
        "performance": {
            "intention": "masquer son soulagement par une provocation",
            "emotion": "séduction inquiète",
            "intensity": 0.7,
            "pace": 0.25,
            "pitch": 0.1,
            "pause_before_seconds": 0.2,
        },
    }

    shot = Shot.model_validate(data)

    assert shot.dialogue is not None
    assert shot.dialogue.performance is not None
    assert shot.dialogue.performance.intention.startswith("masquer")


def test_shot_accepts_three_ordered_visual_beats() -> None:
    data = json.loads(Path("examples/shot.json").read_text(encoding="utf-8"))
    data["visual_beats"] = [
        {"id": "start", "at": 0, "description": "the lid is closed"},
        {"id": "middle", "at": 0.5, "description": "the lock bites the vine"},
        {"id": "end", "at": 1, "description": "the vine recoils"},
    ]

    shot = Shot.model_validate(data)

    assert [beat.id for beat in shot.visual_beats] == ["start", "middle", "end"]


def test_dialogue_speaker_must_be_visible() -> None:
    data = json.loads(Path("examples/shot.json").read_text(encoding="utf-8"))
    data["dialogue"] = {"speaker": "aconit", "text": "Elle n'était pas pour toi."}

    with pytest.raises(ValidationError, match="dialogue speaker"):
        Shot.model_validate(data)
