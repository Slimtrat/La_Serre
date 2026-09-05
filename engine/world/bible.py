from __future__ import annotations

import hashlib
import json
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal, Protocol, cast

from pydantic import BaseModel

from engine.director.models import CanonicalContext, Shot, ShotCharacter
from engine.production.artifacts import write_text_atomic
from engine.world.models import (
    ArtDirection,
    BibleChange,
    CanonicalPrompt,
    CanonicalReference,
    CharacterProfile,
    LocationProfile,
    NarrativeArc,
    ProjectBible,
    PromptScope,
    ReferenceOwner,
    RelationshipState,
    Secret,
    ToneProfile,
    WorldRule,
)

CollectionName = Literal[
    "characters",
    "locations",
    "relationships",
    "world_rules",
    "narrative_arcs",
    "secrets",
    "references",
    "prompts",
]
BibleEntity = (
    CharacterProfile
    | LocationProfile
    | RelationshipState
    | WorldRule
    | NarrativeArc
    | Secret
    | CanonicalReference
    | CanonicalPrompt
)
class EntityWithId(Protocol):
    id: str


class BibleRegistry:
    """Atomic, versioned source of truth for a project's narrative canon."""

    _lock = threading.RLock()

    def __init__(self, private_root: Path) -> None:
        self.private_root = private_root.resolve()
        self.world_root = self.private_root / "world"
        self.path = self.world_root / "bible.json"

    def load(self) -> ProjectBible:
        with self._lock:
            if self.path.is_file():
                return ProjectBible.model_validate_json(self.path.read_text(encoding="utf-8"))
            bible = self._import_legacy()
            self._save(bible)
            return bible

    def replace(self, replacement: ProjectBible) -> ProjectBible:
        current = self.load()
        payload = replacement.model_dump(mode="json")
        payload["revision"] = current.revision + 1
        payload["updated_at"] = datetime.now(UTC)
        payload["changes"] = [
            *current.changes,
            self._change(current.revision + 1, "bible", "project", "replace"),
        ]
        bible = ProjectBible.model_validate(payload)
        self._synchronize_shot_snapshots(bible)
        self._save(bible)
        return bible

    def update_direction(
        self,
        art_direction: ArtDirection,
        tone: ToneProfile,
    ) -> ProjectBible:
        current = self.load()
        payload = current.model_dump(mode="json")
        revision = current.revision + 1
        payload.update(
            {
                "revision": revision,
                "updated_at": datetime.now(UTC),
                "art_direction": art_direction.model_dump(mode="json"),
                "tone": tone.model_dump(mode="json"),
                "changes": [
                    *current.changes,
                    self._change(revision, "direction", "project", "update"),
                ],
            }
        )
        bible = ProjectBible.model_validate(payload)
        self._save(bible)
        return bible

    def put_character(self, entity: CharacterProfile) -> ProjectBible:
        return self._upsert("characters", entity)

    def put_location(self, entity: LocationProfile) -> ProjectBible:
        return self._upsert("locations", entity)

    def put_relationship(self, entity: RelationshipState) -> ProjectBible:
        return self._upsert("relationships", entity)

    def put_world_rule(self, entity: WorldRule) -> ProjectBible:
        return self._upsert("world_rules", entity)

    def put_narrative_arc(self, entity: NarrativeArc) -> ProjectBible:
        return self._upsert("narrative_arcs", entity)

    def put_secret(self, entity: Secret) -> ProjectBible:
        return self._upsert("secrets", entity)

    def put_reference(self, entity: CanonicalReference) -> ProjectBible:
        return self._upsert("references", entity)

    def put_prompt(self, entity: CanonicalPrompt) -> ProjectBible:
        return self._upsert("prompts", entity)

    def delete(self, collection: CollectionName, entity_id: str) -> ProjectBible:
        with self._lock:
            current = self.load()
            raw_items = cast(list[dict[str, object]], current.model_dump(mode="json")[collection])
            items = [item for item in raw_items if item.get("id") != entity_id]
            if len(items) == len(raw_items):
                raise KeyError(entity_id)
            revision = current.revision + 1
            payload = current.model_dump(mode="json")
            payload[collection] = items
            payload["revision"] = revision
            payload["updated_at"] = datetime.now(UTC)
            payload["changes"] = [
                *current.changes,
                self._change(revision, _singular(collection), entity_id, "delete"),
            ]
            bible = ProjectBible.model_validate(payload)
            self._synchronize_shot_snapshots(bible)
            self._save(bible)
            return bible

    def resolve_shot(self, shot: Shot, *, strict: bool = True) -> Shot:
        bible = self.load()
        character_by_id = {character.id: character for character in bible.characters}
        character_by_name = {
            _normalized(character.name): character for character in bible.characters
        }
        resolved_characters: list[ShotCharacter] = []
        for reference in shot.characters:
            profile = character_by_id.get(reference.id)
            if profile is None and not strict:
                profile = character_by_name.get(_normalized(reference.name))
            if profile is None:
                raise ValueError(
                    f"{shot.id} references unknown canonical character {reference.id}"
                )
            expected: dict[str, object] = {
                "name": profile.name,
                "visual_description": profile.visual_description,
                "wardrobe": profile.wardrobe,
                "signature_details": profile.signature_details,
            }
            if strict:
                drift = [
                    field
                    for field, value in expected.items()
                    if getattr(reference, field) != value
                ]
                if drift:
                    raise ValueError(
                        f"{shot.id} duplicates divergent identity for {profile.id}: "
                        + ", ".join(drift)
                    )
            canonical_references = [Path(uri) for uri in profile.visual_references]
            references = list(
                dict.fromkeys([*canonical_references, *reference.reference_images])
            )
            resolved_characters.append(
                reference.model_copy(
                    update={
                        "id": profile.id,
                        **expected,
                        "reference_images": references,
                    }
                )
            )

        location_by_id = {location.id: location for location in bible.locations}
        location_by_name = {
            _normalized(location.name): location for location in bible.locations
        }
        location = location_by_id.get(shot.location)
        if location is None and not strict:
            location = location_by_name.get(_normalized(shot.location))
        if location is None:
            raise ValueError(f"{shot.id} references unknown canonical location {shot.location}")
        if strict and shot.location_description != location.visual_description:
            raise ValueError(f"{shot.id} duplicates a divergent location {location.id}")

        character_ids = {character.id for character in resolved_characters}
        if shot.dialogue:
            if shot.dialogue.speaker not in character_by_id:
                raise ValueError(
                    f"{shot.id} references unknown canonical speaker {shot.dialogue.speaker}"
                )
            character_ids.add(shot.dialogue.speaker)
        context = self._context(bible, character_ids, location.id)
        return shot.model_copy(
            update={
                "location": location.id,
                "location_description": location.visual_description,
                "characters": resolved_characters,
                "canonical_context": context,
            }
        )

    def dependency_ids(
        self,
        entity_type: str,
        entity_id: str,
    ) -> tuple[set[str], set[str]]:
        bible = self.load()
        character_ids: set[str] = set()
        location_ids: set[str] = set()
        global_change = entity_type in {"bible", "direction", "world_rule"}
        if entity_type == "character":
            character_ids.add(entity_id)
        elif entity_type == "location":
            location_ids.add(entity_id)
        elif entity_type == "relationship":
            relationship = _find(bible.relationships, entity_id)
            if relationship:
                character_ids.update((relationship.source, relationship.target))
            else:
                global_change = True
        elif entity_type == "narrative_arc":
            arc = _find(bible.narrative_arcs, entity_id)
            if arc:
                character_ids.update(arc.character_ids)
            else:
                global_change = True
        elif entity_type == "secret":
            secret = _find(bible.secrets, entity_id)
            if secret:
                character_ids.update(secret.owners)
            else:
                global_change = True
        elif entity_type == "reference":
            reference = _find(bible.references, entity_id)
            if reference is None or reference.owner_type == ReferenceOwner.PROJECT:
                global_change = True
            elif reference.owner_type == ReferenceOwner.CHARACTER and reference.owner_id:
                character_ids.add(reference.owner_id)
            elif reference.owner_id:
                location_ids.add(reference.owner_id)
        elif entity_type == "prompt":
            prompt = _find(bible.prompts, entity_id)
            if prompt is None or prompt.scope == PromptScope.PROJECT:
                global_change = True
            elif prompt.scope == PromptScope.CHARACTER and prompt.target_id:
                character_ids.add(prompt.target_id)
            elif prompt.target_id:
                location_ids.add(prompt.target_id)

        episodes: set[str] = set()
        shots: set[str] = set()
        for episode_path in self.private_root.glob(
            "episodes/season-*/S*/episode.json"
        ):
            episode = _read_mapping(episode_path)
            episode_id = str(episode.get("id", ""))
            episode_characters = set(_string_list(episode.get("characters")))
            episode_locations = set(_string_list(episode.get("locations")))
            if (
                global_change
                or character_ids & episode_characters
                or location_ids & episode_locations
            ):
                episodes.add(episode_id)
                shots.update(_string_list(episode.get("shot_order")))
        return episodes, shots

    def _upsert(self, collection: CollectionName, entity: BibleEntity) -> ProjectBible:
        with self._lock:
            current = self.load()
            entity_id = str(entity.id)
            raw_items = cast(list[dict[str, object]], current.model_dump(mode="json")[collection])
            found = any(item.get("id") == entity_id for item in raw_items)
            items = [item for item in raw_items if item.get("id") != entity_id]
            items.append(entity.model_dump(mode="json"))
            revision = current.revision + 1
            payload = current.model_dump(mode="json")
            payload[collection] = items
            payload["revision"] = revision
            payload["updated_at"] = datetime.now(UTC)
            payload["changes"] = [
                *current.changes,
                self._change(
                    revision,
                    _singular(collection),
                    entity_id,
                    "update" if found else "create",
                ),
            ]
            bible = ProjectBible.model_validate(payload)
            self._synchronize_shot_snapshots(bible)
            self._save(bible)
            return bible

    def _context(
        self,
        bible: ProjectBible,
        character_ids: set[str],
        location_id: str,
    ) -> CanonicalContext:
        relevant_relationships = [
            item
            for item in bible.relationships
            if item.source in character_ids or item.target in character_ids
        ]
        relevant_arcs = [
            item for item in bible.narrative_arcs if set(item.character_ids) & character_ids
        ]
        relevant_secrets = [
            item for item in bible.secrets if set(item.owners) & character_ids
        ]
        relevant_prompts = [
            item
            for item in bible.prompts
            if item.scope == PromptScope.PROJECT
            or item.target_id in character_ids
            or item.target_id == location_id
        ]
        entities: dict[str, object] = {
            **{
                f"character:{item.id}": item
                for item in bible.characters
                if item.id in character_ids
            },
            **{
                f"location:{item.id}": item
                for item in bible.locations
                if item.id == location_id
            },
            **{f"relationship:{item.id}": item for item in relevant_relationships},
            **{f"narrative_arc:{item.id}": item for item in relevant_arcs},
            **{f"secret:{item.id}": item for item in relevant_secrets},
            **{f"prompt:{item.id}": item for item in relevant_prompts},
        }
        entity_fingerprints = {
            key: _fingerprint(value) for key, value in entities.items()
        }
        direction = [
            bible.art_direction.summary,
            *bible.art_direction.visual_style,
            *bible.art_direction.palette,
            *bible.art_direction.rendering_rules,
        ]
        tone = [
            bible.tone.summary,
            *bible.tone.keywords,
            *bible.tone.dialogue_rules,
            *bible.tone.content_boundaries,
        ]
        positive = "\n".join(item.positive for item in relevant_prompts if item.positive)
        negatives = [
            bible.art_direction.banned_elements,
            [item.negative for item in relevant_prompts if item.negative],
        ]
        negative = ", ".join(value for group in negatives for value in group)
        constraints = [
            constraint for item in relevant_prompts for constraint in item.constraints
        ]
        global_payload = {
            "art_direction": bible.art_direction,
            "tone": bible.tone,
            "world_rules": bible.world_rules,
            "entities": entity_fingerprints,
        }
        return CanonicalContext(
            revision=bible.revision,
            fingerprint=_fingerprint(global_payload),
            entity_fingerprints=entity_fingerprints,
            art_direction=[value for value in direction if value],
            tone=[value for value in tone if value],
            world_rules=[rule.statement for rule in bible.world_rules],
            relationships=[
                item.model_dump(mode="json") for item in relevant_relationships
            ],
            narrative_arcs=[item.model_dump(mode="json") for item in relevant_arcs],
            secrets=[item.model_dump(mode="json") for item in relevant_secrets],
            positive_prompt=positive,
            negative_prompt=negative,
            constraints=constraints,
        )

    def _import_legacy(self) -> ProjectBible:
        characters = [
            CharacterProfile.model_validate_json(path.read_text(encoding="utf-8"))
            for path in sorted(self.world_root.glob("characters/*/character.json"))
        ]
        locations = [
            LocationProfile.model_validate_json(path.read_text(encoding="utf-8"))
            for path in sorted(self.world_root.glob("locations/*/location.json"))
        ]
        return ProjectBible(characters=characters, locations=locations)

    def _synchronize_shot_snapshots(self, bible: ProjectBible) -> None:
        characters = {item.id: item for item in bible.characters}
        locations = {item.id: item for item in bible.locations}
        for path in self.private_root.glob("episodes/season-*/S*/shots/*.json"):
            payload = _read_mapping(path)
            changed = False
            character_payloads = payload.get("characters")
            if isinstance(character_payloads, list):
                for reference in character_payloads:
                    if not isinstance(reference, dict):
                        continue
                    profile = characters.get(str(reference.get("id", "")))
                    if profile is None:
                        continue
                    expected: dict[str, object] = {
                        "name": profile.name,
                        "visual_description": profile.visual_description,
                        "wardrobe": profile.wardrobe,
                        "signature_details": profile.signature_details,
                    }
                    for field, value in expected.items():
                        if reference.get(field) != value:
                            reference[field] = value
                            changed = True
            location = locations.get(str(payload.get("location", "")))
            if location and payload.get("location_description") != location.visual_description:
                payload["location_description"] = location.visual_description
                changed = True
            if "canonical_context" in payload:
                payload.pop("canonical_context")
                changed = True
            if changed:
                write_text_atomic(
                    path,
                    json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                )

    def _save(self, bible: ProjectBible) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        write_text_atomic(self.path, bible.model_dump_json(indent=2) + "\n")

    @staticmethod
    def _change(
        revision: int,
        entity_type: str,
        entity_id: str,
        operation: Literal["create", "update", "delete", "replace"],
    ) -> BibleChange:
        return BibleChange(
            revision=revision,
            changed_at=datetime.now(UTC),
            entity_type=entity_type,
            entity_id=entity_id,
            operation=operation,
        )


def _find[EntityT: EntityWithId](
    entities: list[EntityT],
    entity_id: str,
) -> EntityT | None:
    return next(
        (entity for entity in entities if str(entity.id) == entity_id),
        None,
    )


def _singular(collection: CollectionName) -> str:
    return {
        "characters": "character",
        "locations": "location",
        "relationships": "relationship",
        "world_rules": "world_rule",
        "narrative_arcs": "narrative_arc",
        "secrets": "secret",
        "references": "reference",
        "prompts": "prompt",
    }[collection]


def _read_mapping(path: Path) -> dict[str, object]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return value if isinstance(value, dict) else {}


def _string_list(value: object) -> list[str]:
    return [str(item) for item in value] if isinstance(value, list) else []


def _normalized(value: str) -> str:
    return " ".join(value.casefold().split())


def _fingerprint(value: object) -> str:
    payload = value.model_dump(mode="json") if isinstance(value, BaseModel) else value
    encoded = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()
