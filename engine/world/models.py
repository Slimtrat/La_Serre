from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime
from enum import StrEnum
from typing import Protocol

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictWorldModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CharacterProfile(StrictWorldModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    name: str = Field(min_length=1)
    role: str = Field(min_length=1)
    visual_description: str = Field(min_length=20)
    wardrobe: str = Field(min_length=20)
    signature_details: list[str] = Field(min_length=1)
    palette: list[str] = Field(min_length=3, max_length=8)
    personality: dict[str, float] = Field(min_length=3)
    wants: list[str] = Field(min_length=1)
    fears: list[str] = Field(min_length=1)
    voice_description: str = Field(min_length=10)
    generation_negative_prompt: str = Field(min_length=1)
    visual_references: list[str] = Field(default_factory=list)
    voice_references: list[str] = Field(default_factory=list)
    canonical_prompt_id: str | None = None

    @field_validator("personality")
    @classmethod
    def personality_values_are_normalized(
        cls,
        value: dict[str, float],
    ) -> dict[str, float]:
        invalid = {name: score for name, score in value.items() if not 0 <= score <= 1}
        if invalid:
            raise ValueError(f"Personality values must be between 0 and 1: {invalid}")
        return value


class LocationProfile(StrictWorldModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    name: str = Field(min_length=1)
    visual_description: str = Field(min_length=20)
    signature_details: list[str] = Field(min_length=1)
    palette: list[str] = Field(min_length=3, max_length=8)
    generation_negative_prompt: str = Field(min_length=1)
    visual_references: list[str] = Field(default_factory=list)
    canonical_prompt_id: str | None = None


class RelationshipState(StrictWorldModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    source: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    target: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    label: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    desire: int = Field(ge=-100, le=100)
    trust: int = Field(ge=-100, le=100)
    anger: int = Field(ge=-100, le=100)
    fear: int = Field(ge=-100, le=100)
    attachment: int = Field(ge=-100, le=100)
    toxicity: int = Field(default=0, ge=0, le=100)

    @model_validator(mode="after")
    def endpoints_are_distinct(self) -> RelationshipState:
        if self.source == self.target:
            raise ValueError("A relationship must connect two different characters")
        return self


class Secret(StrictWorldModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    owners: list[str] = Field(min_length=1)
    known_by: list[str] = Field(default_factory=list)
    hidden_from: list[str] = Field(default_factory=list)
    summary: str = Field(min_length=10)
    severity: float = Field(ge=0, le=1)
    created_episode: int = Field(ge=1)
    revealed: bool = False


class TimelineEvent(StrictWorldModel):
    episode: int = Field(ge=1)
    type: str = Field(min_length=1)
    characters: list[str] = Field(min_length=1)
    description: str = Field(min_length=10)


class ReferenceKind(StrEnum):
    VISUAL = "visual"
    VOICE = "voice"
    MOODBOARD = "moodboard"


class ReferenceOwner(StrEnum):
    PROJECT = "project"
    CHARACTER = "character"
    LOCATION = "location"


class CanonicalReference(StrictWorldModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    kind: ReferenceKind
    owner_type: ReferenceOwner = ReferenceOwner.PROJECT
    owner_id: str | None = None
    uri: str = Field(min_length=1)
    label: str = Field(min_length=1)
    notes: str = ""

    @model_validator(mode="after")
    def owner_is_coherent(self) -> CanonicalReference:
        if self.owner_type == ReferenceOwner.PROJECT and self.owner_id is not None:
            raise ValueError("Project references cannot target an owner id")
        if self.owner_type != ReferenceOwner.PROJECT and self.owner_id is None:
            raise ValueError("Character and location references require an owner id")
        return self


class PromptScope(StrEnum):
    PROJECT = "project"
    CHARACTER = "character"
    LOCATION = "location"


class CanonicalPrompt(StrictWorldModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    scope: PromptScope = PromptScope.PROJECT
    target_id: str | None = None
    positive: str = ""
    negative: str = ""
    constraints: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def target_is_coherent(self) -> CanonicalPrompt:
        if self.scope == PromptScope.PROJECT and self.target_id is not None:
            raise ValueError("Project prompts cannot target an entity")
        if self.scope != PromptScope.PROJECT and self.target_id is None:
            raise ValueError("Scoped prompts require a target id")
        if not self.positive and not self.negative and not self.constraints:
            raise ValueError("A canonical prompt cannot be empty")
        return self


class ArtDirection(StrictWorldModel):
    summary: str = ""
    visual_style: list[str] = Field(default_factory=list)
    palette: list[str] = Field(default_factory=list)
    rendering_rules: list[str] = Field(default_factory=list)
    banned_elements: list[str] = Field(default_factory=list)


class ToneProfile(StrictWorldModel):
    summary: str = ""
    keywords: list[str] = Field(default_factory=list)
    dialogue_rules: list[str] = Field(default_factory=list)
    content_boundaries: list[str] = Field(default_factory=list)


class WorldRule(StrictWorldModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    statement: str = Field(min_length=1)
    applies_to: list[str] = Field(default_factory=list)
    immutable: bool = False


class ArcStatus(StrEnum):
    PLANNED = "planned"
    ACTIVE = "active"
    RESOLVED = "resolved"


class NarrativeArc(StrictWorldModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]*$")
    title: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    character_ids: list[str] = Field(default_factory=list)
    status: ArcStatus = ArcStatus.PLANNED
    start_episode: str | None = Field(default=None, pattern=r"^S\d{2}E\d{3}$")
    end_episode: str | None = Field(default=None, pattern=r"^S\d{2}E\d{3}$")
    beats: list[str] = Field(default_factory=list)


class BibleChange(StrictWorldModel):
    revision: int = Field(ge=1)
    changed_at: datetime
    entity_type: str = Field(min_length=1)
    entity_id: str = Field(min_length=1)
    operation: str = Field(pattern=r"^(create|update|delete|replace)$")


class ProjectBible(StrictWorldModel):
    schema_version: int = 1
    revision: int = Field(default=0, ge=0)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    title: str = "Bible du projet"
    characters: list[CharacterProfile] = Field(default_factory=list)
    locations: list[LocationProfile] = Field(default_factory=list)
    relationships: list[RelationshipState] = Field(default_factory=list)
    art_direction: ArtDirection = Field(default_factory=ArtDirection)
    tone: ToneProfile = Field(default_factory=ToneProfile)
    world_rules: list[WorldRule] = Field(default_factory=list)
    narrative_arcs: list[NarrativeArc] = Field(default_factory=list)
    secrets: list[Secret] = Field(default_factory=list)
    references: list[CanonicalReference] = Field(default_factory=list)
    prompts: list[CanonicalPrompt] = Field(default_factory=list)
    changes: list[BibleChange] = Field(default_factory=list)

    @model_validator(mode="after")
    def canonical_graph_is_coherent(self) -> ProjectBible:
        _unique_entities(self.characters, "character")
        _unique_entities(self.locations, "location")
        for name, entities in (
            ("relationship", self.relationships),
            ("world rule", self.world_rules),
            ("narrative arc", self.narrative_arcs),
            ("secret", self.secrets),
            ("reference", self.references),
            ("prompt", self.prompts),
        ):
            _unique_ids(entities, name)
        character_ids = {character.id for character in self.characters}
        location_ids = {location.id for location in self.locations}
        for relationship in self.relationships:
            if {relationship.source, relationship.target} - character_ids:
                raise ValueError(f"Relationship {relationship.id} references an unknown character")
        for arc in self.narrative_arcs:
            if set(arc.character_ids) - character_ids:
                raise ValueError(f"Narrative arc {arc.id} references an unknown character")
        for secret in self.secrets:
            linked = set(secret.owners + secret.known_by + secret.hidden_from)
            if linked - character_ids:
                raise ValueError(f"Secret {secret.id} references an unknown character")
        for reference in self.references:
            if (
                reference.owner_type == ReferenceOwner.CHARACTER
                and reference.owner_id not in character_ids
            ):
                raise ValueError(f"Reference {reference.id} targets an unknown character")
            if (
                reference.owner_type == ReferenceOwner.LOCATION
                and reference.owner_id not in location_ids
            ):
                raise ValueError(f"Reference {reference.id} targets an unknown location")
        for prompt in self.prompts:
            if prompt.scope == PromptScope.CHARACTER and prompt.target_id not in character_ids:
                raise ValueError(f"Prompt {prompt.id} targets an unknown character")
            if prompt.scope == PromptScope.LOCATION and prompt.target_id not in location_ids:
                raise ValueError(f"Prompt {prompt.id} targets an unknown location")
        return self


class _HasId(Protocol):
    id: str


def _unique_entities(
    entities: list[CharacterProfile] | list[LocationProfile],
    label: str,
) -> None:
    _unique_ids(entities, label)
    normalized_names = [entity.name.casefold().strip() for entity in entities]
    if len(normalized_names) != len(set(normalized_names)):
        raise ValueError(f"Canonical {label} names must be unique")


def _unique_ids(entities: Sequence[_HasId], label: str) -> None:
    identifiers = [str(entity.id) for entity in entities]
    if len(identifiers) != len(set(identifiers)):
        raise ValueError(f"Canonical {label} ids must be unique")
