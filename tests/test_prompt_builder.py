import json
from pathlib import Path

from engine.director.models import Shot
from engine.director.prompt_builder import PromptBuilder


def test_prompt_builder_preserves_semantics_and_identity_language() -> None:
    shot = Shot.model_validate_json(Path("examples/shot.json").read_text(encoding="utf-8"))

    result = PromptBuilder().build(shot)

    assert "Maintain exact identity" in result.positive
    assert "Belladone" in result.positive
    assert "very slow push-in" in result.positive
    assert "identity drift" in result.negative
    assert result.semantic["camera"] == shot.camera.model_dump()
    assert result.semantic["visual_beats"] == [
        beat.model_dump(mode="json") for beat in shot.visual_beats
    ]
    assert "SHOT TIMELINE" in result.positive
    assert "Do not import motifs, furniture or locations from another series" in result.positive
    assert "marble table, door placement" not in result.positive


def test_visual_beat_prompt_puts_the_exact_pose_first() -> None:
    shot = Shot.model_validate_json(Path("examples/shot.json").read_text(encoding="utf-8"))
    package = PromptBuilder().build(shot)

    result = PromptBuilder.visual_beat_prompt(package, "Belladone catches the black ring")

    assert result.startswith("PRIMARY FRAME INSTRUCTION")
    assert result.index("Belladone catches the black ring") < result.index(
        "CHARACTERS VISIBLE IN FRAME:"
    )
    assert "SHOT TIMELINE" not in result
    assert "multiple panels" in result


def test_regional_scene_prompt_keeps_cast_out_of_global_conditioning() -> None:
    payload = json.loads(Path("examples/shot.json").read_text(encoding="utf-8"))
    second = {**payload["characters"][0], "id": "aconit", "name": "Aconit"}
    payload["characters"].append(second)
    shot = Shot.model_validate(payload)

    result = PromptBuilder.regional_scene_prompt(
        shot, "Belladone leans toward Aconit without touching"
    )
    negative = PromptBuilder().build(shot).negative

    assert "exactly 2 separate full botanical character bodies" in result
    assert "Belladone" not in result
    assert "Aconit" not in result
    assert "the assigned regional character" in result
    assert "third character" in negative
    assert "floating head" in negative
