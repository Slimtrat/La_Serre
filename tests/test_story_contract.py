import pytest

from engine.narrative.story_contract import compile_story_contract, reconcile_storyboard
from engine.narrative.workflow_models import EpisodeBreakdownCandidate, ShotBlueprint


def _shot(action: str = "Une proposition libre.") -> ShotBlueprint:
    return ShotBlueprint(
        source_text="Une proposition suffisamment détaillée.",
        duration=0.5,
        location_id="serre",
        shot_type="wide",
        camera_movement="fixed",
        action=action,
        lighting="lune violette",
        mood="inquiétant",
        style=["fantasy"],
    )


def test_contract_restores_exact_windows_when_ai_overproduces() -> None:
    source = """Format de 10 secondes.
1. 0–4 s : apparition du coffre. Aucun dialogue.
2. 4–10 s : la graine ment puis ouvre son œil.
"""
    contract = compile_story_contract(source)
    assert contract is not None
    candidate = EpisodeBreakdownCandidate(shots=[_shot() for _ in range(7)])

    result = reconcile_storyboard(contract, candidate)

    assert len(result.shots) == 2
    assert [shot.duration for shot in result.shots] == [4, 6]
    assert sum(shot.duration for shot in result.shots) == 10
    assert result.shots[1].action.startswith("la graine ment puis ouvre son œil")


def test_contract_rejects_non_contiguous_windows() -> None:
    with pytest.raises(ValueError, match="ne sont pas contiguës"):
        compile_story_contract("1. 0-4 s : début.\n2. 5-9 s : suite.")


def test_contract_is_optional_for_unstructured_ideas() -> None:
    assert compile_story_contract("Une idée libre sans minutage.") is None
