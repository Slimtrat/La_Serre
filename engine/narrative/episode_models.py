from __future__ import annotations

import re
from datetime import UTC, datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from engine.director.models import Shot
from engine.world.models import CharacterProfile, LocationProfile


class StrictEpisodeModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EpisodeStatus(StrEnum):
    IDEA = "idea"
    WRITING = "writing"
    REVIEW = "review"
    DRAFT = "draft"
    APPROVED = "approved"
    BREAKDOWN = "breakdown"
    PRODUCTION = "production"
    FINAL = "final"


class NarrativeProvenance(StrictEpisodeModel):
    """Trace an authoring decision without making generated content canonical."""

    stage: Literal["director", "screenwriter", "validator", "episode", "breakdown"]
    mode: Literal["manual", "import", "ai"]
    provider: str = "human"
    model: str | None = None
    prompt: str = ""
    source_label: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class EpisodeStory(StrictEpisodeModel):
    hook: str = ""
    setup: str = ""
    conflict: str = ""
    reveal: str = ""
    cliffhanger: str = ""


class Episode(StrictEpisodeModel):
    id: str = Field(pattern=r"^S\d{2}E\d{3}$")
    season: int = Field(ge=1, le=99)
    episode: int = Field(ge=1, le=999)
    title: str = "Épisode sans titre"
    logline: str = ""
    duration_target: float = Field(default=30, gt=0, le=600)
    status: EpisodeStatus = EpisodeStatus.IDEA
    characters: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    story: EpisodeStory = Field(default_factory=EpisodeStory)
    narrative_source: str = ""
    shot_order: list[str] = Field(default_factory=list, max_length=99)
    shot_sources: dict[str, str] = Field(default_factory=dict)
    provenance: list[NarrativeProvenance] = Field(default_factory=list)

    @model_validator(mode="after")
    def identifiers_and_sources_are_coherent(self) -> Episode:
        expected_id = f"S{self.season:02d}E{self.episode:03d}"
        if self.id != expected_id:
            raise ValueError(f"Episode id must be {expected_id}")
        if len(set(self.characters)) != len(self.characters):
            raise ValueError("Episode character ids must be unique")
        if len(set(self.locations)) != len(self.locations):
            raise ValueError("Episode location ids must be unique")
        if len(set(self.shot_order)) != len(self.shot_order):
            raise ValueError("Episode shot ids must be unique")
        expected_shot = re.compile(rf"^{self.id}-S\d{{2}}$")
        invalid = [shot_id for shot_id in self.shot_order if not expected_shot.fullmatch(shot_id)]
        if invalid:
            raise ValueError(f"Shot ids do not belong to {self.id}: {invalid}")
        if set(self.shot_sources) != set(self.shot_order):
            raise ValueError("shot_sources keys must exactly match shot_order")
        if (
            self.status
            in {
                EpisodeStatus.BREAKDOWN,
                EpisodeStatus.PRODUCTION,
                EpisodeStatus.FINAL,
            }
            and not self.shot_order
        ):
            raise ValueError(f"Episode status {self.status} requires at least one shot")
        return self


class EpisodeSummary(StrictEpisodeModel):
    id: str
    title: str
    logline: str
    duration_target: float
    status: EpisodeStatus
    shot_count: int


class EpisodePackage(StrictEpisodeModel):
    episode: Episode
    characters: list[CharacterProfile]
    locations: list[LocationProfile]
    shots: list[Shot]
