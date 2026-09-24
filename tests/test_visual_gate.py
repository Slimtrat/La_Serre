from engine.narrative.visual_gate import build_visual_proof_gate
from engine.narrative.workflow_models import EpisodeBreakdownCandidate, ShotBlueprint


def _shot(index: int, *, characters: int = 0, dialogue: bool = False) -> ShotBlueprint:
    character_ids = [f"character-{item}" for item in range(characters)]
    payload: dict[str, object] = {}
    if dialogue:
        payload["dialogue"] = {
            "speaker_id": character_ids[0],
            "text": "Une réplique témoin.",
            "mode": "on_screen",
        }
    return ShotBlueprint(
        source_text=f"Plan source suffisamment détaillé numéro {index}.",
        duration=5,
        location_id="serre",
        character_ids=character_ids,
        shot_type="wide",
        camera_movement="fixed",
        action="Une action claire.",
        lighting="lune violette",
        mood="inquiétant",
        style=["fantasy"],
        **payload,
    )


def test_gate_selects_opening_richest_interaction_and_climax() -> None:
    storyboard = EpisodeBreakdownCandidate(
        shots=[
            _shot(1),
            _shot(2, characters=1),
            _shot(3, characters=2, dialogue=True),
            _shot(4, characters=1),
            _shot(5),
        ]
    )

    gate = build_visual_proof_gate("S01E001", storyboard)

    assert gate.status == "awaiting_generation"
    assert gate.production_unlocked is False
    assert [item.shot_id for item in gate.witnesses] == [
        "S01E001-S01",
        "S01E001-S03",
        "S01E001-S05",
    ]
    assert [item.role for item in gate.witnesses] == [
        "establishing",
        "interaction",
        "climax",
    ]
