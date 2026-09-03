from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.generation.comfy.client import ComfyJobStatus, ComfyOutput
from engine.generation.comfy.workflow_loader import LoadedWorkflow


@dataclass(frozen=True, slots=True)
class VideoGenerationRequest:
    keyframe: Path
    profile_path: Path
    context: dict[str, Any]
    timeout_seconds: float | None = None


@dataclass(frozen=True, slots=True)
class VideoGenerationResult:
    generation_id: str
    workflow: LoadedWorkflow
    outputs: list[ComfyOutput]


class VideoGenerator(ABC):
    @abstractmethod
    async def generate(self, request: VideoGenerationRequest) -> VideoGenerationResult:
        raise NotImplementedError

    @abstractmethod
    async def status(self, generation_id: str) -> ComfyJobStatus:
        raise NotImplementedError

    @abstractmethod
    async def cancel(self, generation_id: str) -> None:
        raise NotImplementedError
