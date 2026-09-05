from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from engine.director.models import Shot
from engine.world.bible import BibleRegistry
from engine.world.impact import BibleImpactAnalyzer
from engine.world.models import (
    ArtDirection,
    CharacterProfile,
    LocationProfile,
    ProjectBible,
    RelationshipState,
    ToneProfile,
    WorldRule,
)


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def character(
    identifier: str = "iris",
    name: str = "Iris",
    description: str = "A silver botanical woman with a geometric flower silhouette",
) -> CharacterProfile:
    return CharacterProfile(
        id=identifier,
        name=name,
        role="Witness",
        visual_description=description,
        wardrobe="A charcoal petal coat with precise violet stitching",
        signature_details=["silver iris hairpin"],
        palette=["silver", "violet", "charcoal"],
        personality={"curiosity": 0.8, "loyalty": 0.5, "fear": 0.2},
        wants=["understand the room"],
        fears=["forgetting what she saw"],
        voice_description="Quiet French voice with careful measured diction",
        generation_negative_prompt="blonde hair, colorful clothes",
    )


def location() -> LocationProfile:
    return LocationProfile(
        id="glass_room",
        name="Glass room",
        visual_description="A nocturnal glass room with black iron walls and green marble",
        signature_details=["green marble floor"],
        palette=["black", "green", "moonlight blue"],
        generation_negative_prompt="daylight, modern room",
    )


def shot_payload() -> dict[str, object]:
    profile = character()
    place = location()
    return {
        "id": "S01E001-S01",
        "duration": 4,
        "location": place.id,
        "location_description": place.visual_description,
        "characters": [
            {
                "id": profile.id,
                "name": profile.name,
                "emotion": "careful attention",
                "position": "foreground center",
                "visual_description": profile.visual_description,
                "wardrobe": profile.wardrobe,
                "signature_details": profile.signature_details,
                "reference_images": [],
            }
        ],
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


def test_registry_migrates_legacy_profiles_to_one_persistent_bible(
    tmp_path: Path,
) -> None:
    profile = character()
    place = location()
    write_json(
        tmp_path / "world/characters/iris/character.json",
        profile.model_dump(mode="json"),
    )
    write_json(
        tmp_path / "world/locations/glass_room/location.json",
        place.model_dump(mode="json"),
    )

    bible = BibleRegistry(tmp_path).load()
    restored = ProjectBible.model_validate_json(
        (tmp_path / "world/bible.json").read_text(encoding="utf-8")
    )

    assert [item.id for item in bible.characters] == ["iris"]
    assert [item.id for item in restored.locations] == ["glass_room"]
    assert restored.revision == 0


def test_bible_enforces_unique_identity_and_valid_relationship_graph(
    tmp_path: Path,
) -> None:
    registry = BibleRegistry(tmp_path)
    registry.put_character(character())

    with pytest.raises(ValidationError, match="names must be unique"):
        registry.put_character(character("other-iris", "IRIS"))


def test_directional_relationship_tracks_explicit_toxicity() -> None:
    relationship = RelationshipState(
        id="iris-vers-belladone",
        source="iris",
        target="belladone",
        label="Fascination dangereuse",
        summary="Iris désire Belladone mais ne lui accorde aucune confiance.",
        desire=85,
        trust=-70,
        anger=25,
        fear=60,
        attachment=75,
        toxicity=92,
    )

    assert relationship.source == "iris"
    assert relationship.target == "belladone"
    assert relationship.toxicity == 92


def test_shot_is_resolved_against_canon_and_divergence_is_rejected(
    tmp_path: Path,
) -> None:
    registry = BibleRegistry(tmp_path)
    registry.put_character(character())
    registry.put_location(location())
    registry.update_direction(
        ArtDirection(
            summary="Gothic botanical fantasy",
            visual_style=["painterly cel shading"],
            banned_elements=["photorealistic humans"],
        ),
        ToneProfile(summary="Dark romance", keywords=["playful", "macabre"]),
    )
    registry.put_world_rule(
        WorldRule(
            id="living-plants",
            statement="Poison plants visibly react to whoever is speaking",
        )
    )

    shot = Shot.model_validate(shot_payload())
    resolved = registry.resolve_shot(shot)

    assert resolved.canonical_context is not None
    assert resolved.canonical_context.revision == 4
    assert "Gothic botanical fantasy" in resolved.canonical_context.art_direction
    assert resolved.canonical_context.world_rules == [
        "Poison plants visibly react to whoever is speaking"
    ]
    assert "character:iris" in resolved.canonical_context.entity_fingerprints

    divergent = shot.model_copy(
        update={
            "characters": [
                shot.characters[0].model_copy(update={"name": "Iris parallèle"})
            ]
        }
    )
    with pytest.raises(ValueError, match="duplicates divergent identity"):
        registry.resolve_shot(divergent)


def test_bible_change_detects_dependent_generated_artifacts(
    tmp_path: Path,
) -> None:
    private = tmp_path / "private"
    output = tmp_path / "output"
    registry = BibleRegistry(private)
    registry.put_character(character())
    registry.put_location(location())
    episode = {
        "id": "S01E001",
        "characters": ["iris"],
        "locations": ["glass_room"],
        "shot_order": ["S01E001-S01"],
    }
    write_json(private / "episodes/season-01/S01E001/episode.json", episode)
    write_json(
        private / "episodes/season-01/S01E001/shots/S01E001-S01.json",
        shot_payload(),
    )
    resolved = registry.resolve_shot(Shot.model_validate(shot_payload()))
    write_json(
        output / "S01E001-S01/generation.json",
        {
            "status": "GENERATED",
            "input": {"shot": resolved.model_dump(mode="json")},
        },
    )
    write_json(
        output / "S01E001/episode-generation.json",
        {
            "status": "FINAL",
            "inputs": {
                "canonical_context": {
                    "revision": resolved.canonical_context.revision
                    if resolved.canonical_context
                    else 0
                }
            },
        },
    )
    previous_revision = registry.load().revision

    registry.put_character(
        character(description="A silver botanical woman whose petals now form a crown")
    )
    impact = BibleImpactAnalyzer(registry, output).analyze(
        since_revision=previous_revision
    )

    assert impact["affected_episodes"] == ["S01E001"]
    assert impact["affected_shots"] == ["S01E001-S01"]
    assert impact["artifact_count"] == 2
    artifacts = impact["artifacts"]
    assert isinstance(artifacts, list)
    assert {item["kind"] for item in artifacts} == {"shot", "episode"}
    synchronized = json.loads(
        (
            private / "episodes/season-01/S01E001/shots/S01E001-S01.json"
        ).read_text(encoding="utf-8")
    )
    assert synchronized["characters"][0]["visual_description"].endswith(
        "form a crown"
    )
