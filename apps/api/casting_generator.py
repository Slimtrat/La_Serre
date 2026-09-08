from __future__ import annotations

import tempfile
from collections.abc import Callable
from pathlib import Path

import httpx

from apps.api.casting_routes import (
    CastingGenerateRequest,
    GeneratedIdentityImage,
)
from engine.config import Settings
from engine.generation.comfy.client import ComfyClient
from engine.generation.comfy.errors import (
    ComfyProtocolError,
    ComfyTimeoutError,
    WorkflowConfigurationError,
)
from engine.generation.comfy.executor import ComfyWorkflowExecutor


class CastingGeneratorUnavailable(RuntimeError):
    pass


class ComfyCastingGenerator:
    """Runs the configured keyframe profile as a portrait/full-body casting workflow."""

    def __init__(self, settings_provider: Callable[[], Settings]) -> None:
        self.settings_provider = settings_provider

    async def __call__(
        self,
        character_id: str,
        payload: CastingGenerateRequest,
    ) -> GeneratedIdentityImage:
        settings = self.settings_provider()
        profile = settings.keyframe_workflow_profile
        if profile is None or not profile.is_file():
            raise CastingGeneratorUnavailable(
                "No keyframe workflow is configured; import remains available"
            )
        width, height = (768, 1024) if payload.kind.value == "portrait" else (768, 1344)
        prompt = ", ".join(
            part
            for part in (
                payload.prompt.strip(),
                payload.permanent_identity.strip(),
                payload.outfit.strip(),
                payload.transient_state.strip(),
                (
                    "single character portrait, neutral background"
                    if payload.kind.value == "portrait"
                    else "single character full body turnaround, neutral background"
                ),
            )
            if part
        )
        try:
            async with ComfyClient(
                str(settings.comfyui_url),
                request_timeout_seconds=settings.comfyui_timeout_seconds,
                poll_interval_seconds=settings.comfyui_poll_interval_seconds,
            ) as client:
                if not await client.is_ready():
                    raise CastingGeneratorUnavailable(
                        "ComfyUI is unavailable; import remains available"
                    )
                execution = await ComfyWorkflowExecutor(client).execute(
                    profile,
                    {
                        "prompt": prompt,
                        "negative_prompt": (
                            "multiple people, duplicate body, cropped feet, text, watermark"
                        ),
                        "seed": payload.seed,
                        "width": width,
                        "height": height,
                        "output_prefix": f"Serre/casting/{character_id}",
                    },
                    timeout_seconds=settings.comfyui_timeout_seconds,
                )
                output = next(
                    (
                        item
                        for item in execution.outputs
                        if item.suffix in {".png", ".jpg", ".jpeg", ".webp"}
                    ),
                    None,
                )
                if output is None:
                    raise CastingGeneratorUnavailable(
                        "The casting workflow produced no supported image"
                    )
                with tempfile.TemporaryDirectory(prefix="la-serre-casting-") as folder:
                    destination = Path(folder) / ("candidate" + output.suffix)
                    await client.download_output(output, destination)
                    content = destination.read_bytes()
                model = next(
                    (
                        str(node["inputs"]["ckpt_name"])
                        for node in execution.loaded.template.values()
                        if isinstance(node, dict)
                        and isinstance(node.get("inputs"), dict)
                        and node["inputs"].get("ckpt_name")
                    ),
                    payload.model,
                )
                return GeneratedIdentityImage(
                    content=content,
                    media_type={
                        ".png": "image/png",
                        ".jpg": "image/jpeg",
                        ".jpeg": "image/jpeg",
                        ".webp": "image/webp",
                    }[output.suffix],
                    source_label=f"ComfyUI prompt {execution.prompt_id}",
                    model=model,
                    workflow=execution.loaded.profile.id,
                    revision=execution.loaded.sha256,
                )
        except CastingGeneratorUnavailable:
            raise
        except (
            httpx.HTTPError,
            OSError,
            ComfyProtocolError,
            ComfyTimeoutError,
            WorkflowConfigurationError,
        ) as exc:
            raise CastingGeneratorUnavailable(
                f"Casting generation failed: {exc}; import remains available"
            ) from exc
