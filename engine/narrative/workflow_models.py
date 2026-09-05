from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, Literal, cast

from pydantic import BaseModel, ConfigDict, Field, model_validator

from engine.narrative.episode_models import EpisodeStory, NarrativeProvenance


class StrictWorkflowModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @classmethod
    def ollama_schema(cls) -> dict[str, Any]:
        schema = cls.model_json_schema()
        definitions = schema.pop("$defs", {})
        return cast(dict[str, Any], _inline_schema(schema, definitions))


class StageStatus(StrEnum):
    EMPTY = "empty"
    DRAFT = "draft"
    APPROVED = "approved"


class DirectorBrief(StrictWorkflowModel):
    concept: str = Field(min_length=10, max_length=10_000)
    genre: str = Field(min_length=1, max_length=120)
    tone: str = Field(min_length=1, max_length=500)
    visual_direction: str = Field(min_length=1, max_length=2000)
    constraints: list[str] = Field(default_factory=list, max_length=30)
    target_episode_duration: float = Field(default=45, gt=0, le=600)
    themes: list[str] = Field(default_factory=list, max_length=20)
    narrative_rules: list[str] = Field(default_factory=list, max_length=30)
    series_objectives: list[str] = Field(default_factory=list, max_length=20)


class ProposedEpisode(StrictWorkflowModel):
    season: int = Field(default=1, ge=1, le=99)
    episode: int = Field(ge=1, le=999)
    title: str = Field(min_length=1, max_length=180)
    logline: str = Field(min_length=10, max_length=1000)
    synopsis: str = Field(min_length=20, max_length=20_000)
    cliffhanger: str = Field(default="", max_length=2000)
    character_ids: list[str] = Field(default_factory=list)
    location_ids: list[str] = Field(default_factory=list)


class ScreenwriterPlan(StrictWorkflowModel):
    series_arc: str = Field(min_length=20, max_length=20_000)
    character_progression: list[str] = Field(default_factory=list, max_length=50)
    relationship_progression: list[str] = Field(default_factory=list, max_length=50)
    episodes: list[ProposedEpisode] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def episode_numbers_are_unique(self) -> ScreenwriterPlan:
        keys = [(episode.season, episode.episode) for episode in self.episodes]
        if len(keys) != len(set(keys)):
            raise ValueError("Proposed episode numbers must be unique")
        return self


class NarrativeFinding(StrictWorkflowModel):
    severity: Literal["blocker", "warning", "suggestion"]
    title: str = Field(min_length=1, max_length=160)
    message: str = Field(min_length=1, max_length=2000)
    recommendation: str = Field(default="", max_length=1000)


class GeneralValidation(StrictWorkflowModel):
    verdict: Literal["pass", "warning", "fail"]
    summary: str = Field(min_length=1, max_length=3000)
    findings: list[NarrativeFinding] = Field(default_factory=list, max_length=30)

    @model_validator(mode="after")
    def verdict_matches_findings(self) -> GeneralValidation:
        severities = {finding.severity for finding in self.findings}
        if self.verdict == "fail" and "blocker" not in severities:
            raise ValueError("A failed validation requires a blocker")
        if self.verdict == "warning" and not severities.intersection({"warning", "blocker"}):
            raise ValueError("A warning validation requires a warning")
        return self


class DirectorStage(StrictWorkflowModel):
    status: StageStatus = StageStatus.EMPTY
    content: DirectorBrief | None = None
    provenance: NarrativeProvenance | None = None
    approved_at: datetime | None = None


class ScreenwriterStage(StrictWorkflowModel):
    status: StageStatus = StageStatus.EMPTY
    content: ScreenwriterPlan | None = None
    provenance: NarrativeProvenance | None = None
    approved_at: datetime | None = None


class ValidatorStage(StrictWorkflowModel):
    status: StageStatus = StageStatus.EMPTY
    content: GeneralValidation | None = None
    provenance: NarrativeProvenance | None = None
    approved_at: datetime | None = None
    override_reason: str | None = None


class SeriesNarrativeWorkflow(StrictWorkflowModel):
    schema_version: int = 1
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    director: DirectorStage = Field(default_factory=DirectorStage)
    screenwriter: ScreenwriterStage = Field(default_factory=ScreenwriterStage)
    validator: ValidatorStage = Field(default_factory=ValidatorStage)
    published_episode_ids: list[str] = Field(default_factory=list)


class EpisodeDraftCandidate(StrictWorkflowModel):
    title: str = Field(min_length=1, max_length=180)
    logline: str = Field(min_length=10, max_length=1000)
    story: EpisodeStory
    narrative_source: str = Field(min_length=20, max_length=50_000)
    character_ids: list[str] = Field(default_factory=list)
    location_ids: list[str] = Field(default_factory=list)


class ShotDialogueBlueprint(StrictWorkflowModel):
    speaker_id: str = Field(min_length=1)
    text: str = Field(min_length=1, max_length=1000)
    intention: str = Field(default="", max_length=500)
    emotion: str = Field(default="", max_length=200)


class ShotBlueprint(StrictWorkflowModel):
    source_text: str = Field(min_length=10, max_length=10_000)
    duration: float = Field(gt=0, le=12)
    location_id: str = Field(min_length=1)
    character_ids: list[str] = Field(min_length=1, max_length=3)
    shot_type: str = Field(min_length=1, max_length=100)
    camera_movement: str = Field(min_length=1, max_length=200)
    lens: str = Field(default="50mm", min_length=1, max_length=100)
    action: str = Field(min_length=1, max_length=3000)
    dialogue: ShotDialogueBlueprint | None = None
    lighting: str = Field(min_length=1, max_length=500)
    mood: str = Field(min_length=1, max_length=500)
    style: list[str] = Field(min_length=1, max_length=12)

    @model_validator(mode="after")
    def dialogue_speaker_is_visible(self) -> ShotBlueprint:
        if self.dialogue and self.dialogue.speaker_id not in self.character_ids:
            raise ValueError("Dialogue speaker must be present in character_ids")
        return self


class EpisodeBreakdownCandidate(StrictWorkflowModel):
    shots: list[ShotBlueprint] = Field(min_length=1, max_length=99)


def _inline_schema(value: Any, definitions: dict[str, Any]) -> Any:
    if isinstance(value, list):
        return [_inline_schema(item, definitions) for item in value]
    if not isinstance(value, dict):
        return value
    reference = value.get("$ref")
    if isinstance(reference, str):
        return _inline_schema(definitions[reference.rsplit("/", 1)[-1]], definitions)
    return {
        key: _inline_schema(item, definitions)
        for key, item in value.items()
        if key not in {"title", "default"}
    }
