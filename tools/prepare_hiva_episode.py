"""Editorially prepare one complete Hiva episode through the public Studio gates.

The guided AI candidates remain archived separately; this script creates a
reviewed 32-second French episode with a coherent eight-shot storyboard.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any, cast

from fastapi.testclient import TestClient

from apps.api.main import create_app
from engine.config import Settings
from engine.world.bible import BibleRegistry
from engine.world.models import CharacterProfile, LocationProfile, ProjectBible
from tools.run_local_narrative_smoke import ROOT


def _bible() -> ProjectBible:
    return ProjectBible(
        characters=[
            CharacterProfile(
                id="hiva",
                name="Hiva",
                role="Jeune corneille métamorphosée en enfant",
                visual_description=(
                    "Young girl with raven-black feathered wings, black hair and curious "
                    "dark eyes; her injured left wing remains visibly bandaged"
                ),
                wardrobe=(
                    "Simple midnight-blue wool tunic, warm boots and a small linen wing bandage"
                ),
                signature_details=["two entirely black raven wings", "bandage on left wing"],
                palette=["raven black", "midnight blue", "warm ivory"],
                personality={"curiosity": 0.9, "independence": 0.8, "caution": 0.6},
                wants=["Comprendre les mots et choisir pour elle-même"],
                fears=["Être enfermée ou blessée de nouveau"],
                voice_description="Voix d'enfant française, vive et prudente",
                generation_negative_prompt="white wings, silver wings, angel halo, adult woman",
            ),
            CharacterProfile(
                id="miran",
                name="Miran",
                role="Magicien solitaire aux pouvoirs limités",
                visual_description=(
                    "Adult male forest magician with dark brown hair, gentle face and "
                    "weathered hands; a calm and slightly tired expression"
                ),
                wardrobe="Plain charcoal wool coat over an earth-brown tunic and practical boots",
                signature_details=["charcoal wool coat", "small amber lantern"],
                palette=["charcoal", "earth brown", "amber"],
                personality={"patience": 0.8, "solitude": 0.7, "humility": 0.6},
                wants=["Protéger Hiva sans décider à sa place"],
                fears=["Faire du mal avec une magie mal maîtrisée"],
                voice_description="Voix masculine française, douce et posée",
                generation_negative_prompt="child, woman, wizard hat, grandiose magic",
            ),
        ],
        locations=[
            LocationProfile(
                id="forest_house",
                name="Maison de Miran",
                visual_description=(
                    "Small weathered timber cottage in a snowy forest, with warm amber "
                    "windows, a wooden table, a fireplace and a dark doorway"
                ),
                signature_details=["amber lantern", "snow at the doorway", "wooden table"],
                palette=["snow white", "warm amber", "dark timber"],
                generation_negative_prompt="city, palace, modern furniture, summer",
            )
        ],
    )


STORY = {
    "hook": "Une jeune corneille blessée frappe à la porte de Miran pendant une nuit de neige.",
    "setup": (
        "En voulant la réchauffer, Miran déclenche une magie involontaire : la corneille "
        "devient une enfant aux ailes noires. Elle choisit elle-même le nom de Hiva."
    ),
    "conflict": (
        "Son aile reste blessée. Miran voudrait tout régler par magie, mais sa lumière "
        "s'éteint sans la guérir. Hiva refuse qu'il décide à sa place."
    ),
    "reveal": (
        "Miran lui demande la permission de poser un bandage. Hiva accepte et lui montre "
        "un nid abîmé derrière la fenêtre : ils peuvent s'entraider sans magie."
    ),
    "cliffhanger": (
        "Ensemble, ils ouvrent la porte sur la forêt. Une famille choisie commence, "
        "et la neige garde encore d'autres secrets."
    ),
}


def _shot(
    source: str,
    action: str,
    characters: list[str],
    *,
    dialogue: tuple[str, str] | None = None,
    lighting: str = "Warm amber candlelight against cold blue snow",
    mood: str = "Tender and quietly magical",
    shot_type: str = "medium shot",
) -> dict[str, Any]:
    return {
        "source_text": source,
        "duration": 4.0,
        "location_id": "forest_house",
        "character_ids": characters,
        "shot_type": shot_type,
        "camera_movement": "slow gentle push",
        "lens": "50mm",
        "action": action,
        "dialogue": (
            {
                "speaker_id": dialogue[0],
                "text": dialogue[1],
                "mode": "on_screen",
                "intention": "Créer un lien de confiance",
                "emotion": "tendresse prudente",
            }
            if dialogue
            else None
        ),
        "lighting": lighting,
        "mood": mood,
        "style": ["storybook fantasy", "soft painterly detail", "consistent character design"],
    }


SHOTS = [
    _shot(
        "Une nuit de neige, une corneille blessée arrive à la maison de Miran.",
        "Snowy timber cottage at night; a small black raven silhouette reaches the doorstep",
        [],
        shot_type="establishing wide shot",
    ),
    _shot(
        "Miran ouvre la porte et une étincelle transforme la corneille en enfant ailée.",
        "Miran opens the door; soft amber magic reveals Hiva as a girl with black raven wings",
        ["miran", "hiva"],
        shot_type="wide interior shot",
    ),
    _shot(
        "Hiva, surprise et blessée, découvre ses mains et garde ses ailes noires.",
        "Hiva looks at her hands and folds her injured black wing carefully",
        ["hiva"],
        dialogue=("hiva", "Je m'appelle Hiva."),
        shot_type="close-up",
    ),
    _shot(
        "Miran tente une petite magie pour soigner l'aile, mais la lumière s'éteint.",
        "Miran tries a small healing light; it fades before touching Hiva's injured wing",
        ["miran", "hiva"],
        dialogue=("miran", "Ma magie ne suffit pas."),
    ),
    _shot(
        "Miran s'agenouille et demande à Hiva la permission de regarder son aile.",
        "Miran kneels at a respectful distance and offers a clean linen bandage",
        ["miran", "hiva"],
        dialogue=("miran", "Je peux regarder ton aile ?"),
    ),
    _shot(
        "Hiva accepte le bandage, à condition que Miran agisse doucement.",
        "Hiva nods and holds out her black wing while Miran bandages it gently",
        ["hiva", "miran"],
        dialogue=("hiva", "Oui. Mais doucement."),
        shot_type="close-up",
    ),
    _shot(
        "Hiva aperçoit un nid abîmé dehors et montre à Miran ce qu'ils peuvent réparer.",
        "Hiva points toward a small damaged raven nest visible through the snowy window",
        ["hiva", "miran"],
        dialogue=("hiva", "Regarde. On peut l'aider."),
    ),
    _shot(
        "Ensemble, Hiva et Miran sortent sous la neige pour réparer le nid.",
        "Hiva and Miran step through the cottage door into snow, carrying twigs and linen",
        ["hiva", "miran"],
        shot_type="wide closing shot",
    ),
]


def _post(client: TestClient, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    response = client.post(path, json=payload or {})
    if response.is_error:
        raise RuntimeError(f"{path}: {response.status_code} {response.text[:1200]}")
    return cast(dict[str, Any], response.json())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT / "artifacts" / "hiva-full-pipeline-run2")
    args = parser.parse_args()
    root = args.root.resolve()
    settings = Settings(
        _env_file=None,
        private_content_dir=root / "private",
        output_dir=root / "output",
        downloads_dir=root / "downloads",
        ollama_model="qwen3:4b",
    )
    BibleRegistry(settings.private_content_dir).replace(_bible())
    with TestClient(create_app(settings)) as client:
        episode = _post(
            client,
            "/api/episodes",
            {
                "title": "Une visite dans la neige",
                "concept": " ".join(STORY.values()),
                "duration_target": 32,
            },
        )
        episode_id = episode["id"]
        _post(
            client,
            f"/api/episodes/{episode_id}/draft/apply",
            {
                "candidate": {
                    "title": "Une visite dans la neige",
                    "logline": (
                        "Une jeune corneille métamorphosée et un magicien apprennent "
                        "à se faire confiance sans compter sur une magie toute-puissante."
                    ),
                    "story": STORY,
                    "narrative_source": " ".join(STORY.values()),
                    "character_ids": ["hiva", "miran"],
                    "location_ids": ["forest_house"],
                },
                "mode": "manual",
                "source_label": "Révision éditoriale du brief Hiva après génération IA",
            },
        )
        review = _post(client, f"/api/episodes/{episode_id}/review")
        if not review["can_approve"]:
            raise RuntimeError(f"Relecture bloquée : {review['findings']}")
        _post(client, f"/api/episodes/{episode_id}/approve")
        package = client.get(f"/api/episodes/{episode_id}").json()
        breakdown = _post(
            client,
            f"/api/episodes/{episode_id}/breakdown/apply",
            {
                "candidate": {"shots": SHOTS},
                "enforce_format": True,
                "expected_breakdown_fingerprint": package["breakdown_fingerprint"],
                "mode": "manual",
                "source_label": "Storyboard éditorial Hiva, 8 plans / 32 secondes",
            },
        )
    print(f"{episode_id}: {len(breakdown['shots'])} plans, 32 s, revue approuvée")
    print(f"Contrats : {root / 'private' / 'episodes' / 'season-01' / episode_id}")


if __name__ == "__main__":
    main()
