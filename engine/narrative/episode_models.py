from __future__ import annotations

import re
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, model_validator

from engine.director.models import Shot
from engine.world.models import CharacterProfile, LocationProfile


class StrictEpisodeModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EpisodeStatus(StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"
    FINAL = "final"


class EpisodeStory(StrictEpisodeModel):
    hook: str = Field(min_length=1)
    setup: str = Field(min_length=1)
    conflict: str = Field(min_length=1)
    reveal: str = Field(min_length=1)
    cliffhanger: str = Field(min_length=1)


class Episode(StrictEpisodeModel):
    id: str = Field(pattern=r"^S\d{2}E\d{3}$")
    season: int = Field(ge=1, le=99)
    episode: int = Field(ge=1, le=999)
    title: str = Field(min_length=1)
    logline: str = Field(min_length=20)
    duration_target: float = Field(gt=0, le=60)
    status: EpisodeStatus = EpisodeStatus.DRAFT
    characters: list[str] = Field(min_length=1)
    locations: list[str] = Field(min_length=1)
    story: EpisodeStory
    narrative_source: str = Field(min_length=20)
    shot_order: list[str] = Field(min_length=1, max_length=12)
    shot_sources: dict[str, str]

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
