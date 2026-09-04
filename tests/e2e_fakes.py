from __future__ import annotations

import asyncio
import json
import struct
import time
import wave
from pathlib import Path
from typing import Any, ClassVar

from engine.audio.models import VoicePreset
from engine.generation.comfy.client import ComfyOutput, UploadedImage
from engine.media.ffmpeg import AssemblyRequest


class MockComfyEngine:
    """In-memory stand-in for the external ComfyUI HTTP service.

    Workflow loading/mapping, prompt construction, output selection and artifact
    persistence stay inside the production pipeline. Only the remote engine's
    submit/wait/download boundary is simulated.
    """

    submitted_workflows: ClassVar[list[dict[str, Any]]] = []
    uploaded_images: ClassVar[list[Path]] = []
    outputs: ClassVar[dict[str, ComfyOutput]] = {}
    delay_seconds: ClassVar[float] = 0.025

    def __init__(self, *_args: object, **_kwargs: object) -> None:
        pass

    @classmethod
    def reset(cls) -> None:
        cls.submitted_workflows = []
        cls.uploaded_images = []
        cls.outputs = {}

    async def __aenter__(self) -> MockComfyEngine:
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def submit_workflow(self, workflow: dict[str, Any]) -> str:
        prompt_id = f"mock-prompt-{len(self.submitted_workflows) + 1}"
        self.submitted_workflows.append(workflow)
        output_node_id, suffix, kind = self._output_contract(workflow)
        self.outputs[prompt_id] = ComfyOutput(
            node_id=output_node_id,
            kind=kind,
            filename=f"{prompt_id}{suffix}",
        )
        return prompt_id

    async def wait(self, prompt_id: str, _timeout_seconds: float | None = None) -> None:
        assert prompt_id in self.outputs
        await asyncio.sleep(self.delay_seconds)

    async def get_outputs(self, prompt_id: str) -> list[ComfyOutput]:
        return [self.outputs[prompt_id]]

    async def download_output(self, output: ComfyOutput, destination: Path) -> None:
        assert output in self.outputs.values()
        destination.parent.mkdir(parents=True, exist_ok=True)
        if output.suffix == ".png":
            content = b"\x89PNG\r\n\x1a\n" + output.filename.encode("ascii")
        else:
            content = b"\x00\x00\x00\x18ftypmp42" + output.filename.encode("ascii")
        await asyncio.to_thread(destination.write_bytes, content)

    async def upload_image(
        self, source: Path, *, overwrite: bool = False
    ) -> UploadedImage:
        del overwrite
        assert await asyncio.to_thread(source.is_file)
        resolved = await asyncio.to_thread(source.resolve)
        self.uploaded_images.append(resolved)
        return UploadedImage(name=f"mock-upload-{len(self.uploaded_images)}{source.suffix}")

    async def cancel(self, prompt_id: str) -> None:
        assert prompt_id in self.outputs

    @staticmethod
    def _output_contract(workflow: dict[str, Any]) -> tuple[str, str, str]:
        for node_id, node in workflow.items():
            if not isinstance(node, dict):
                continue
            class_type = node.get("class_type")
            if class_type == "MockSaveImage":
                return node_id, ".png", "images"
            if class_type == "MockSaveVideo":
                return node_id, ".mp4", "videos"
        raise AssertionError("The mapped workflow has no mock external output node")


class MockSpeechEngine:
    """Deterministic replacement for the OS/cloud TTS engine."""

    name = "mock-tts"
    output_suffix = ".wav"
    syntheses: ClassVar[list[tuple[str, Path, VoicePreset]]] = []

    @classmethod
    def reset(cls) -> None:
        cls.syntheses = []

    def synthesize(self, text: str, destination: Path, preset: VoicePreset) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        self.syntheses.append((text, destination.resolve(), preset))
        write_test_wave(destination, duration=0.3)


class MockFfmpegEngine:
    """Filesystem-producing substitute for the external FFmpeg executable."""

    name = "mock-ffmpeg"
    assembly_requests: ClassVar[list[AssemblyRequest]] = []

    @classmethod
    def reset(cls) -> None:
        cls.assembly_requests = []

    def duration(self, path: Path) -> float:
        assert path.is_file()
        return 0.3

    def fit_audio(self, source: Path, destination: Path, duration: float) -> float:
        assert source.is_file() and duration > 0
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(source.read_bytes())
        return 1.0

    def assemble(self, request: AssemblyRequest) -> None:
        assert request.segments
        assert all(segment.visual.is_file() for segment in request.segments)
        assert all(segment.audio is None or segment.audio.is_file() for segment in request.segments)
        assert request.subtitles is not None and request.subtitles.is_file()
        assert request.music is not None and request.music.is_file()
        assert request.ambience is not None and request.ambience.is_file()
        self.assembly_requests.append(request)
        time.sleep(0.035)
        payload = json.dumps(
            {
                "shots": [segment.shot_id for segment in request.segments],
                "subtitles": request.subtitles.name,
                "music": request.music.name,
                "ambience": request.ambience.name,
            },
            sort_keys=True,
        ).encode("utf-8")
        request.output.write_bytes(b"\x00\x00\x00\x18ftypmp42" + payload)

    def verify(
        self,
        path: Path,
        *,
        duration: float,
        width: int,
        height: int,
    ) -> dict[str, object]:
        assert path.is_file() and path.stat().st_size > 20
        return {
            "duration": duration,
            "width": width,
            "height": height,
            "has_audio": True,
            "has_subtitles": True,
        }

    def version(self) -> str:
        return "mock-ffmpeg 1.0"


def write_test_wave(destination: Path, *, duration: float = 0.15) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    sample_rate = 8_000
    sample = struct.pack("<h", 0)
    with wave.open(str(destination), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        output.writeframes(sample * round(sample_rate * duration))
