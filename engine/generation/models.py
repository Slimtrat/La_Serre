from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field


class GenerationState(StrEnum):
    DRAFT = "DRAFT"
    GENERATING = "GENERATING"
    AWAITING_KEYFRAME_APPROVAL = "AWAITING_KEYFRAME_APPROVAL"
    GENERATED = "GENERATED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    FINAL = "FINAL"
    FAILED = "FAILED"


class OutputArtifact(BaseModel):
    model_config = ConfigDict(extra="forbid")

    path: str
    sha256: str
    media_type: str


class StageRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    backend: str
    workflow_id: str
    workflow_sha256: str
    prompt_id: str | None = None
    seed: int
    status: str
    outputs: list[OutputArtifact] = Field(default_factory=list)


class GenerationRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: int = 1
    id: str
    shot_id: str
    type: str = "shot"
    backend: str = "ltx"
    status: GenerationState = GenerationState.DRAFT
    created_at: datetime
    completed_at: datetime | None = None
    seed: int
    input: dict[str, object]
    stages: list[StageRecord] = Field(default_factory=list)
    outputs: list[OutputArtifact] = Field(default_factory=list)
    error: str | None = None


class ReferenceRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    character_id: str
    source_path: Path
    sha256: str
    comfyui_name: str | None = None
