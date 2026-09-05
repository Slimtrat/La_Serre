from pathlib import Path

import pytest

from engine.director.models import DialogueMode, Shot
from engine.director.prompt_builder import PromptBuilder
from engine.narrative.coherence import RuleBasedCoherenceValidator
from engine.narrative.episode_models import Episode, EpisodePackage
from engine.narrative.narrative_workflow import build_shots
from engine.narrative.workflow_models import EpisodeBreakdownCandidate
from engine.world.models import CharacterProfile, LocationProfile, ProjectBible


def _bible() -> ProjectBible:
    return ProjectBible(
        characters=[
            CharacterProfile(
                id="narrator",
                name="Narratrice",
                role="Voix éditoriale",
                visual_description="Une journaliste adulte au visage anguleux et regard précis",
                wardrobe="Un tailleur bleu nuit sobre avec un micro miniature argenté",
                signature_details=["micro argenté"],
                palette=["bleu nuit", "argent", "ivoire"],
                personality={"ironie": 0.8, "calme": 0.9, "curiosite": 0.7},
                wants=["raconter les contradictions"],
                fears=["simplifier les gens"],
                voice_description="Voix posée, ironique, avec des silences assumés",
                generation_negative_prompt="caricature, sourire permanent",
            )
        ],
        locations=[
            LocationProfile(
                id="kitchen",
                name="Cuisine ordinaire",
                visual_description="Petite cuisine blanche vécue, éclairée par un néon fatigué",
                signature_details=["bouilloire cabossée"],
                palette=["blanc", "gris", "bleu"],
                generation_negative_prompt="greenhouse, vines, marble pedestal",
            )
        ],
    )


def _voice_over_candidate() -> EpisodeBreakdownCandidate:
    return EpisodeBreakdownCandidate.model_validate(
        {
            "shots": [
                {
                    "source_text": (
                        "Le grille-pain n’avait rien demandé. "
                        "Le grille-pain n’avait rien demandé."
                    ),
                    "duration": 4,
                    "location_id": "kitchen",
                    "character_ids": [],
                    "shot_type": "insert",
                    "camera_movement": "slow push-in",
                    "action": "Le grille-pain fume seul sur le plan de travail.",
                    "dialogue": {
                        "speaker_id": "narrator",
                        "text": "Le grille-pain n’avait rien demandé.",
                        "mode": "voice_over",
                        "intention": "Traiter le banal comme une affaire nationale",
                        "emotion": "gravité ironique",
                    },
                    "lighting": "néon froid",
                    "mood": "drame télévisé absurde",
                    "style": ["reportage magazine"],
                }
            ]
        }
    )


def test_voice_over_can_narrate_a_shot_without_visible_character() -> None:
    episode = Episode(id="S01E001", season=1, episode=1)
    updated, shots = build_shots(episode, _voice_over_candidate(), _bible())

    shot = shots[0]
    assert shot.characters == []
    assert shot.dialogue is not None
    assert shot.dialogue.mode is DialogueMode.VOICE_OVER
    assert updated.characters == ["narrator"]
    assert "voice-over narration" in PromptBuilder().build(shot).positive


def test_only_on_screen_speech_requires_a_visible_speaker() -> None:
    payload = Shot.model_validate_json(
        Path("examples/shot.json").read_text(encoding="utf-8")
    ).model_dump(mode="json")
    payload["characters"] = []
    payload["dialogue"] = {
        "speaker": "narrator",
        "text": "Personne ne vit venir le drame.",
        "mode": "off_screen",
    }
    assert isinstance(payload["dialogue"], dict)
    payload["dialogue"]["mode"] = "off_screen"

    assert Shot.model_validate(payload).dialogue is not None
    payload["dialogue"]["mode"] = "on_screen"
    with pytest.raises(ValueError, match="on-screen"):
        Shot.model_validate(payload)


def test_coherence_accepts_canonical_voice_over_without_visible_speaker() -> None:
    episode = Episode(id="S01E001", season=1, episode=1)
    updated, shots = build_shots(episode, _voice_over_candidate(), _bible())
    package = EpisodePackage(
        episode=updated,
        characters=_bible().characters,
        locations=_bible().locations,
        shots=shots,
    )

    findings = RuleBasedCoherenceValidator().validate(
        scope="episode",
        package=package,
        bible=_bible(),
    )

    assert "speaker_not_visible" not in {finding.code for finding in findings}
