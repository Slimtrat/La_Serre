from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictTemplateModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class OutputCriteria(StrictTemplateModel):
    aspect_ratio: Literal["9:16"]
    width: int = Field(ge=256, multiple_of=8)
    height: int = Field(ge=256, multiple_of=8)
    duration_seconds_min: int = Field(ge=1)
    duration_seconds_max: int = Field(ge=1)
    shot_count_min: int = Field(ge=1)
    shot_count_max: int = Field(ge=1)

    @model_validator(mode="after")
    def ranges_are_ordered(self) -> OutputCriteria:
        if self.duration_seconds_min > self.duration_seconds_max:
            raise ValueError("Minimum duration cannot exceed maximum duration")
        if self.shot_count_min > self.shot_count_max:
            raise ValueError("Minimum shot count cannot exceed maximum shot count")
        if self.height <= self.width:
            raise ValueError("A 9:16 format must be portrait")
        return self


class RelationshipAxis(StrictTemplateModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*$")
    label: str = Field(min_length=1)
    description: str = Field(min_length=10)
    minimum: int = Field(default=-100, ge=-100, le=100)
    maximum: int = Field(default=100, ge=-100, le=100)

    @model_validator(mode="after")
    def range_is_ordered(self) -> RelationshipAxis:
        if self.minimum >= self.maximum:
            raise ValueError("Relationship axis minimum must be lower than maximum")
        return self


class SeriesFormatProfile(StrictTemplateModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*$")
    version: int = Field(ge=1)
    name: str = Field(min_length=1)
    language: str = Field(pattern=r"^[a-z]{2}$")
    output: OutputCriteria
    required_beats: tuple[str, ...] = Field(min_length=4)
    narrative_constraints: tuple[str, ...] = Field(min_length=1)
    relationship_axes: tuple[RelationshipAxis, ...] = Field(min_length=1)
    acceptance_criteria: tuple[str, ...] = Field(min_length=1)

    @model_validator(mode="after")
    def identifiers_and_beats_are_unique(self) -> SeriesFormatProfile:
        axis_ids = [axis.id for axis in self.relationship_axes]
        if len(axis_ids) != len(set(axis_ids)):
            raise ValueError("Relationship axis ids must be unique")
        normalized_beats = [beat.casefold().strip() for beat in self.required_beats]
        if len(normalized_beats) != len(set(normalized_beats)):
            raise ValueError("Required beats must be unique")
        return self

    def task_context(self) -> dict[str, object]:
        """Return stable, JSON-ready rules that any TaskSpec can consume."""
        return self.model_dump(mode="json")


class ProjectTemplate(StrictTemplateModel):
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*$")
    version: int = Field(ge=1)
    name: str = Field(min_length=1)
    description: str = Field(min_length=20)
    format_profile: SeriesFormatProfile
    example_catalog: str | None = None
    originality_notice: str = Field(min_length=20)

    @model_validator(mode="after")
    def profile_matches_template(self) -> ProjectTemplate:
        if self.format_profile.id != self.id or self.format_profile.version != self.version:
            raise ValueError("Template and format profile identity must match")
        return self
