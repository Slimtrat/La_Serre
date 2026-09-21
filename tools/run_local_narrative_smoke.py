"""Generate review-only episode candidates with the real local Ollama model.

Each story runs in a disposable Studio project. Only the candidate and compact
diagnostics survive in artifacts; no generated proposal is applied canonically.
"""

from __future__ import annotations

import argparse
import json
import tempfile
import time
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from apps.api.main import create_app
from engine.config import Settings
from engine.narrative.workflow_models import EpisodeDraftCandidate
from engine.world.bible import BibleRegistry
from engine.world.models import CharacterProfile, LocationProfile, ProjectBible

ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = (
    ROOT / "starter_catalog/story-examples/fritz-pizzafest-de.json",
    ROOT / "starter_catalog/story-examples/hiva-forest-magic.json",
)


def _character(identifier: str, name: str, role: str, visual: str) -> CharacterProfile:
    return CharacterProfile(
        id=identifier,
        name=name,
        role=role,
        visual_description=visual,
        wardrobe="Tenue simple et cohérente avec son quotidien dans cette histoire",
        signature_details=[visual],
        palette=["brun", "vert", "bleu"],
        personality={"curiosity": 0.7, "kindness": 0.8, "caution": 0.5},
        wants=["Aider les autres"],
        fears=["Perdre un ami"],
        voice_description="Voix douce, claire et reconnaissable",
        generation_negative_prompt="inconsistent appearance",
    )


def _location(identifier: str, name: str, visual: str) -> LocationProfile:
    return LocationProfile(
        id=identifier,
        name=name,
        visual_description=visual,
        signature_details=[visual],
        palette=["brun", "vert", "bleu"],
        generation_negative_prompt="inconsistent architecture",
    )


def _seed_bible(example_id: str, root: Path) -> tuple[set[str], set[str]]:
    if example_id == "fritz-pizzafest-de":
        characters = [
            _character(
                "fritz",
                "Fritz",
                "Chat jardinier",
                "Chat jardinier avec des légumes frais du potager",
            ),
            _character(
                "klaus",
                "Klaus",
                "Frère âne restaurateur",
                "Âne restaurateur qui prépare des pizzas avec son frère",
            ),
            _character(
                "lukas",
                "Lukas",
                "Frère âne restaurateur",
                "Âne restaurateur qui cuisine avec son frère au village",
            ),
        ]
        locations = [
            _location(
                "garden", "Jardin de Fritz", "Potager de Fritz avec légumes et herbes fraîches"
            ),
            _location(
                "restaurant",
                "Restaurant des frères ânes",
                "Petit restaurant chaleureux tenu par les deux frères ânes",
            ),
        ]
    elif example_id == "hiva-forest-magic":
        characters = [
            _character(
                "hiva",
                "Hiva",
                "Enfant corneille",
                "Enfant aux ailes de corneille entièrement noires",
            ),
            _character(
                "miran",
                "Miran",
                "Magicien solitaire",
                "Magicien solitaire accueillant Hiva dans sa maison forestière",
            ),
        ]
        locations = [
            _location(
                "forest_house",
                "Maison de Miran",
                "Maison isolée dans une forêt enneigée et magique",
            ),
        ]
    else:
        raise ValueError(f"Exemple inconnu : {example_id}")
    BibleRegistry(root).replace(ProjectBible(characters=characters, locations=locations))
    return {character.id for character in characters}, {location.id for location in locations}


def run_case(example_path: Path, output_dir: Path, model: str) -> dict[str, Any]:
    example = json.loads(example_path.read_text(encoding="utf-8"))
    brief = example["brief"]
    language_name = {"de": "allemand", "fr": "français"}[brief["language"]]
    with tempfile.TemporaryDirectory(prefix="la-serre-narrative-") as folder:
        root = Path(folder)
        settings = Settings(
            _env_file=None,
            private_content_dir=root / "private",
            output_dir=root / "output",
            downloads_dir=root / "downloads",
            ollama_model=model,
            ollama_url="http://127.0.0.1:11434",
        )
        character_ids, location_ids = _seed_bible(example["id"], settings.private_content_dir)
        with TestClient(create_app(settings)) as client:
            created = client.post(
                "/api/episodes",
                json={
                    "title": brief["episode_title"],
                    "concept": brief["episode_concept"],
                    "duration_target": 45,
                },
            )
            created.raise_for_status()
            episode_id = created.json()["id"]
            started = time.perf_counter()
            generated = client.post(
                f"/api/episodes/{episode_id}/draft/generate",
                json={
                    "model": model,
                    "source_text": brief["episode_concept"],
                    "prompt": (
                        "Contrainte de langue prioritaire : rédige tous les contenus narratifs "
                        f"et éditoriaux générés en {language_name} "
                        f"(code {brief['language']}). Conserve les IDs canoniques inchangés. "
                        f"Public : {brief['audience']}. "
                        f"Ton : {brief['tone']}. Respecte ces personnages et l'histoire : "
                        f"{brief['idea']}"
                    ),
                },
            )
            elapsed = time.perf_counter() - started
            if generated.is_error:
                raise RuntimeError(
                    f"Génération refusée ({generated.status_code}) : {generated.text[:4000]}"
                )
            payload = generated.json()
            candidate = EpisodeDraftCandidate.model_validate(payload["candidate"])
            if not set(candidate.character_ids) <= character_ids:
                raise RuntimeError(f"Personnages hors Bible : {candidate.character_ids}")
            if not set(candidate.location_ids) <= location_ids:
                raise RuntimeError(f"Lieux hors Bible : {candidate.location_ids}")
            if payload.get("execution", {}).get("task_version") != 2:
                raise RuntimeError("Le projet libre n'utilise pas la tâche narrative générique v2")
            canonical = client.get(f"/api/episodes/{episode_id}")
            canonical.raise_for_status()
            episode = canonical.json()["episode"]
            unchanged = (
                payload.get("canonical") is False
                and episode["status"] == "idea"
                and episode["narrative_source"] == brief["episode_concept"]
            )
            if not unchanged:
                raise RuntimeError("La génération a modifié l'épisode canonique")
    report = {
        "example_id": example["id"],
        "language": brief["language"],
        "model": model,
        "elapsed_seconds": round(elapsed, 2),
        "canonical_unchanged": unchanged,
        "execution": payload.get("execution"),
        "candidate": candidate.model_dump(mode="json"),
        "review_warnings": [
            message
            for invalid, message in (
                (not candidate.character_ids, "Casting absent : revue humaine nécessaire."),
                (not candidate.location_ids, "Lieux absents : revue humaine nécessaire."),
            )
            if invalid
        ],
    }
    destination = output_dir / f"{example['id']}.json"
    destination.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"{example['id']}: contrat valide, {elapsed:.1f} s, candidat : {destination}", flush=True)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke narratif réel avec Ollama local")
    parser.add_argument("--model", default="qwen3:4b")
    parser.add_argument(
        "--output-dir", type=Path, default=Path("artifacts/first-narrative-generation")
    )
    parser.add_argument("--case", choices=("fritz-pizzafest-de", "hiva-forest-magic"))
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for example in EXAMPLES:
        if args.case is None or example.stem == args.case:
            run_case(example, args.output_dir, args.model)


if __name__ == "__main__":
    main()
