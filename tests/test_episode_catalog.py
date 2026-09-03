from __future__ import annotations

import json
from pathlib import Path

import pytest

from engine.world.catalog import EpisodeCatalog


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def seed_catalog(root: Path) -> Path:
    character = {
        "id": "iris",
        "name": "Iris",
        "role": "Witness",
        "visual_description": "A woman with silver hair and a precise geometric silhouette",
        "wardrobe": "A long charcoal coat with violet stitching and dark leather boots",
        "signature_details": ["silver iris hairpin"],
        "palette": ["silver", "violet", "charcoal"],
        "personality": {"curiosity": 0.8, "loyalty": 0.5, "fear": 0.2},
        "wants": ["understand the room"],
        "fears": ["forgetting what she saw"],
        "voice_description": "Quiet French voice with careful measured diction",
        "generation_negative_prompt": "blonde hair, colorful clothes",
    }
    location = {
        "id": "glass_room",
        "name": "Glass room",
        "visual_description": (
            "A nocturnal glass room with black iron walls and a green marble floor"
        ),
        "signature_details": ["green marble floor"],
        "palette": ["black", "green", "moonlight blue"],
        "generation_negative_prompt": "daylight, modern room",
    }
    shot_character = {
        "id": character["id"],
        "name": character["name"],
        "emotion": "careful attention",
        "position": "foreground center",
        "visual_description": character["visual_description"],
        "wardrobe": character["wardrobe"],
        "signature_details": character["signature_details"],
        "reference_images": [],
    }
    shot = {
        "id": "S01E001-S01",
        "duration": 4,
        "location": location["id"],
        "location_description": location["visual_description"],
        "characters": [shot_character],
        "camera": {"shot_type": "medium", "movement": "static", "lens": "50mm"},
        "action": "Iris enters the glass room and stops",
        "dialogue": None,
        "lighting": "cold moonlight",
        "mood": "quiet suspicion",
        "style": ["cinematic realism"],
        "render": {
            "seed": 1,
            "width": 576,
            "height": 1024,
            "fps": 24,
            "frames": 97,
            "negative_prompt": "",
        },
    }
    episode = {
        "id": "S01E001",
        "season": 1,
        "episode": 1,
        "title": "The room",
        "logline": "Iris enters a room that seems to remember her.",
        "duration_target": 4,
        "status": "draft",
        "characters": ["iris"],
        "locations": ["glass_room"],
        "story": {
            "hook": "A locked room opens.",
            "setup": "Iris enters.",
            "conflict": "The door closes.",
            "reveal": "The room knows her.",
            "cliffhanger": "A light turns on.",
        },
        "narrative_source": "Iris enters the room and realizes it already knows her name.",
        "shot_order": ["S01E001-S01"],
        "shot_sources": {"S01E001-S01": "Iris enters the glass room and stops."},
    }
    write_json(root / "world/characters/iris/character.json", character)
    write_json(root / "world/locations/glass_room/location.json", location)
    write_json(root / "episodes/season-01/S01E001/episode.json", episode)
    shot_path = root / "episodes/season-01/S01E001/shots/S01E001-S01.json"
    write_json(shot_path, shot)
    return shot_path


def test_catalog_loads_a_continuity_checked_episode(tmp_path: Path) -> None:
    seed_catalog(tmp_path)

    package = EpisodeCatalog(tmp_path).load("S01E001")

    assert package.episode.title == "The room"
    assert [character.id for character in package.characters] == ["iris"]
    assert [shot.id for shot in package.shots] == ["S01E001-S01"]
    assert EpisodeCatalog(tmp_path).list_episodes()[0].shot_count == 1


def test_catalog_rejects_character_visual_drift(tmp_path: Path) -> None:
    shot_path = seed_catalog(tmp_path)
    shot = json.loads(shot_path.read_text(encoding="utf-8"))
    shot["characters"][0]["visual_description"] = "A completely different person"
    write_json(shot_path, shot)

    with pytest.raises(ValueError, match="drifts from iris.visual_description"):
        EpisodeCatalog(tmp_path).load("S01E001")
