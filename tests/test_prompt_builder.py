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
