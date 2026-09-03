from __future__ import annotations

from typing import Any, Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field

WorkflowKind = Literal["keyframe", "video"]
JobMode = Literal["all", "keyframe", "video"]
SourceMode = Literal["model", "manual"]


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


class JobIdentifier(BaseModel):
    id: str = Field(min_length=1)
