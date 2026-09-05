from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field

from engine.narrative.episode_models import EpisodeStatus, EpisodeStory
from engine.narrative.workflow_models import (
    DirectorBrief,
    EpisodeBreakdownCandidate,
    EpisodeDraftCandidate,
    GeneralValidation,
    ScreenwriterPlan,
)

WorkflowKind = Literal["keyframe", "video"]
JobMode = Literal["all", "keyframe", "video"]
SourceMode = Literal["model", "manual"]
TtsMode = Literal["auto", "edge", "sapi", "none"]


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


class StageGenerationRequest(StrictRequest):
    shot: dict[str, Any]
    tts: TtsMode = "auto"


class ProjectCreateRequest(StrictRequest):
    name: str = Field(min_length=1, max_length=80)
    clone_content: bool = True


class ProjectStorageRequest(StrictRequest):
    work_root: Path
    output_root: Path


class ProjectRemovalRequest(StrictRequest):
    mode: Literal["keep_files", "delete_files"]
    confirmation: str | None = Field(default=None, max_length=80)


class ProjectFolderRequest(StrictRequest):
    role: Literal["work", "output"]


class NotificationCreateRequest(StrictRequest):
    level: Literal["info", "success", "warning", "error"] = "error"
    title: str = Field(min_length=1, max_length=120)
    message: str = Field(min_length=1, max_length=2000)
    source: str = Field(default="client", min_length=1, max_length=80)


class NotificationReadRequest(StrictRequest):
    ids: list[str] | None = None


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


class EditorialProvenanceRequest(StrictRequest):
    provider: str = Field(default="manual", min_length=1, max_length=80)
    model: str | None = Field(default=None, min_length=1, max_length=160)
    prompt: str | None = Field(default=None, max_length=10_000)
    seed: int | None = None


class EditorialVersionRequest(StrictRequest):
    scope: Literal["episode", "shot"]
    kind: Literal["version", "variant"]
    name: str = Field(min_length=1, max_length=80)
    shot_id: str | None = Field(default=None, pattern=r"^S\d{2}E\d{3}-S\d{2}$")
    episode: dict[str, Any] | None = None
    shots: list[dict[str, Any]] | None = None
    shot: dict[str, Any] | None = None
    shot_source: str | None = Field(default=None, max_length=50_000)
    provenance: EditorialProvenanceRequest = Field(
        default_factory=EditorialProvenanceRequest
    )


class EditorialExplanationRequest(StrictRequest):
    scope: Literal["episode", "shot"]
    left: str = Field(min_length=1, max_length=128)
    right: str = Field(min_length=1, max_length=128)
    shot_id: str | None = Field(default=None, pattern=r"^S\d{2}E\d{3}-S\d{2}$")


class NarrativeGenerateRequest(StrictRequest):
    source_text: str = Field(default="", max_length=50_000)
    prompt: str = Field(default="", max_length=10_000)
    model: str | None = Field(default=None, min_length=1)


class DirectorSaveRequest(StrictRequest):
    content: DirectorBrief
    mode: Literal["manual", "import", "ai"] = "manual"
    prompt: str = Field(default="", max_length=10_000)
    model: str | None = None
    source_label: str = Field(default="", max_length=500)


class ScreenwriterSaveRequest(StrictRequest):
    content: ScreenwriterPlan
    mode: Literal["manual", "import", "ai"] = "manual"
    prompt: str = Field(default="", max_length=10_000)
    model: str | None = None
    source_label: str = Field(default="", max_length=500)


class ValidatorSaveRequest(StrictRequest):
    content: GeneralValidation
    mode: Literal["manual", "import", "ai"] = "manual"
    prompt: str = Field(default="", max_length=10_000)
    model: str | None = None
    source_label: str = Field(default="", max_length=500)


class NarrativeApprovalRequest(StrictRequest):
    override_reason: str = Field(default="", max_length=2000)


class EpisodeCreateRequest(StrictRequest):
    season: int = Field(default=1, ge=1, le=99)
    episode: int | None = Field(default=None, ge=1, le=999)
    title: str = Field(default="Épisode sans titre", min_length=1, max_length=180)
    concept: str = Field(default="", max_length=50_000)
    duration_target: float = Field(default=30, gt=0, le=600)


class EpisodePatchRequest(StrictRequest):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    logline: str | None = Field(default=None, max_length=1000)
    duration_target: float | None = Field(default=None, gt=0, le=600)
    status: EpisodeStatus | None = None
    characters: list[str] | None = None
    locations: list[str] | None = None
    story: EpisodeStory | None = None
    narrative_source: str | None = Field(default=None, max_length=50_000)


class EpisodeDraftApplyRequest(StrictRequest):
    candidate: EpisodeDraftCandidate
    mode: Literal["manual", "import", "ai"] = "manual"
    prompt: str = Field(default="", max_length=10_000)
    model: str | None = None
    source_label: str = Field(default="", max_length=500)


class BreakdownApplyRequest(StrictRequest):
    candidate: EpisodeBreakdownCandidate
    mode: Literal["manual", "import", "ai"] = "manual"
    prompt: str = Field(default="", max_length=10_000)
    model: str | None = None
    source_label: str = Field(default="", max_length=500)


class JobIdentifier(BaseModel):
    id: str = Field(min_length=1)
