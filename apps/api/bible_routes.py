from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Literal, cast

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict

from engine.world.bible import BibleRegistry
from engine.world.impact import BibleImpactAnalyzer
from engine.world.models import (
    ArtDirection,
    CanonicalPrompt,
    CanonicalReference,
    CharacterProfile,
    LocationProfile,
    NarrativeArc,
    ProjectBible,
    RelationshipState,
    Secret,
    ToneProfile,
    WorldRule,
)

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

EntityCollection = Literal[
    "characters",
    "locations",
    "relationships",
    "world_rules",
    "narrative_arcs",
    "secrets",
    "references",
    "prompts",
]


class BibleDirectionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    art_direction: ArtDirection
    tone: ToneProfile


def create_bible_router(
    registry_provider: Callable[[], BibleRegistry],
    output_root_provider: Callable[[], Path],
) -> APIRouter:
    router = APIRouter(prefix="/api/bible", tags=["bible"])

    def analyzer() -> BibleImpactAnalyzer:
        return BibleImpactAnalyzer(registry_provider(), output_root_provider())

    def response(bible: ProjectBible, previous_revision: int) -> dict[str, object]:
        return {
            "bible": bible.model_dump(mode="json"),
            "impact": analyzer().analyze(
                bible,
                since_revision=previous_revision,
            ),
        }

    @router.get("")
    def get_bible() -> dict[str, object]:
        bible = registry_provider().load()
        return bible.model_dump(mode="json")

    @router.put("")
    def replace_bible(payload: ProjectBible) -> dict[str, object]:
        registry = registry_provider()
        previous = registry.load().revision
        try:
            bible = registry.replace(payload)
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return response(bible, previous)

    @router.get("/impact")
    def get_impact(
        since_revision: int = Query(default=0, ge=0),
    ) -> dict[str, object]:
        return analyzer().analyze(since_revision=since_revision)

    @router.get("/dependencies/{entity_type}/{entity_id}")
    def get_dependencies(entity_type: str, entity_id: str) -> dict[str, object]:
        return analyzer().dependencies(entity_type, entity_id)

    @router.get("/direction")
    def get_direction() -> dict[str, object]:
        bible = registry_provider().load()
        return {
            "art_direction": bible.art_direction.model_dump(mode="json"),
            "tone": bible.tone.model_dump(mode="json"),
        }

    @router.put("/direction")
    def put_direction(payload: BibleDirectionRequest) -> dict[str, object]:
        registry = registry_provider()
        previous = registry.load().revision
        try:
            bible = registry.update_direction(payload.art_direction, payload.tone)
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return response(bible, previous)

    @router.put("/characters/{entity_id}")
    def put_character(
        entity_id: str,
        payload: CharacterProfile,
    ) -> dict[str, object]:
        return _put(registry_provider(), analyzer(), entity_id, payload, "character")

    @router.put("/locations/{entity_id}")
    def put_location(
        entity_id: str,
        payload: LocationProfile,
    ) -> dict[str, object]:
        return _put(registry_provider(), analyzer(), entity_id, payload, "location")

    @router.put("/relationships/{entity_id}")
    def put_relationship(
        entity_id: str,
        payload: RelationshipState,
    ) -> dict[str, object]:
        return _put(registry_provider(), analyzer(), entity_id, payload, "relationship")

    @router.put("/world_rules/{entity_id}")
    def put_world_rule(
        entity_id: str,
        payload: WorldRule,
    ) -> dict[str, object]:
        return _put(registry_provider(), analyzer(), entity_id, payload, "world_rule")

    @router.put("/narrative_arcs/{entity_id}")
    def put_narrative_arc(
        entity_id: str,
        payload: NarrativeArc,
    ) -> dict[str, object]:
        return _put(registry_provider(), analyzer(), entity_id, payload, "narrative_arc")

    @router.put("/secrets/{entity_id}")
    def put_secret(
        entity_id: str,
        payload: Secret,
    ) -> dict[str, object]:
        return _put(registry_provider(), analyzer(), entity_id, payload, "secret")

    @router.put("/references/{entity_id}")
    def put_reference(
        entity_id: str,
        payload: CanonicalReference,
    ) -> dict[str, object]:
        return _put(registry_provider(), analyzer(), entity_id, payload, "reference")

    @router.put("/prompts/{entity_id}")
    def put_prompt(
        entity_id: str,
        payload: CanonicalPrompt,
    ) -> dict[str, object]:
        return _put(registry_provider(), analyzer(), entity_id, payload, "prompt")

    @router.get("/{collection}/{entity_id}")
    def get_entity(
        collection: EntityCollection,
        entity_id: str,
    ) -> dict[str, object]:
        bible = registry_provider().load()
        entities = cast(list[BibleEntity], getattr(bible, collection))
        entity = next(
            (item for item in entities if str(item.id) == entity_id),
            None,
        )
        if entity is None:
            raise HTTPException(status_code=404, detail="Canonical entity not found")
        return entity.model_dump(mode="json")

    @router.delete("/{collection}/{entity_id}")
    def delete_entity(
        collection: EntityCollection,
        entity_id: str,
    ) -> dict[str, object]:
        registry = registry_provider()
        entity_type = _entity_type(collection)
        dependencies = analyzer().dependencies(entity_type, entity_id)
        if collection in {"characters", "locations"} and dependencies["referenced"]:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Canonical entity is still referenced",
                    "dependencies": dependencies,
                },
            )
        previous = registry.load().revision
        try:
            bible = registry.delete(collection, entity_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Canonical entity not found") from exc
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return response(bible, previous)

    return router


def _put(
    registry: BibleRegistry,
    analyzer: BibleImpactAnalyzer,
    entity_id: str,
    payload: BibleEntity,
    entity_type: str,
) -> dict[str, object]:
    payload_id = str(payload.id)
    if entity_id != payload_id:
        raise HTTPException(status_code=409, detail="Path id and canonical id differ")
    previous = registry.load().revision
    methods: dict[str, Callable[[object], ProjectBible]] = {
        "character": cast(Callable[[object], ProjectBible], registry.put_character),
        "location": cast(Callable[[object], ProjectBible], registry.put_location),
        "relationship": cast(Callable[[object], ProjectBible], registry.put_relationship),
        "world_rule": cast(Callable[[object], ProjectBible], registry.put_world_rule),
        "narrative_arc": cast(Callable[[object], ProjectBible], registry.put_narrative_arc),
        "secret": cast(Callable[[object], ProjectBible], registry.put_secret),
        "reference": cast(Callable[[object], ProjectBible], registry.put_reference),
        "prompt": cast(Callable[[object], ProjectBible], registry.put_prompt),
    }
    try:
        bible = methods[entity_type](payload)
    except (OSError, ValueError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {
        "bible": bible.model_dump(mode="json"),
        "impact": analyzer.analyze(bible, since_revision=previous),
    }


def _entity_type(collection: EntityCollection) -> str:
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
