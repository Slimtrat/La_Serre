from __future__ import annotations

from typing import Any, Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field

WorkflowKind = Literal["keyframe", "video"]
JobMode = Literal["all", "keyframe", "video"]
SourceMode = Literal["model", "manual"]
TtsMode = Literal["auto", "sapi", "none"]


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class StudioConfigRequest(StrictRequest):
    comfyui_url: AnyHttpUrl


class WorkflowImportRequest(StrictRequest):
    kind: WorkflowKind
    workflow: dict[str, Any]


class WorkflowProfileRequest(StrictRequest):
    kind: WorkflowKind
    bindings: dict[str, str | None]


class GenerationRequest(StrictRequest):
    shot: dict[str, Any]
    mode: JobMode = "all"
    keyframe_source: SourceMode = "model"
    force: bool = False


class EpisodeGenerationRequest(StrictRequest):
    tts: TtsMode = "auto"
    allow_stills: bool = False
    force: bool = False
    width: int = Field(default=576, ge=256, le=2160, multiple_of=8)
    height: int = Field(default=1024, ge=256, le=3840, multiple_of=8)
    fps: int = Field(default=24, ge=1, le=120)


class ShotDraftRequest(StrictRequest):
    source_text: str = Field(min_length=20, max_length=50_000)
    shot_id: str = Field(pattern=r"^S\d{2}E\d{3}-S\d{2}$")
    duration: float = Field(default=4.0, gt=0, le=12)
    model: str | None = Field(default=None, min_length=1)


class JobIdentifier(BaseModel):
    id: str = Field(min_length=1)
