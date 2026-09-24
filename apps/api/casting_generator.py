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
from engine.observability.studio_activity import (
    ActivityGraphTarget,
    StageStatus,
    StudioActivityStore,
)


class CastingGeneratorUnavailable(RuntimeError):
    pass


class ComfyCastingGenerator:
    """Runs the configured character-master workflow for visual casting."""

    def __init__(self, settings_provider: Callable[[], Settings]) -> None:
        self.settings_provider = settings_provider

    async def __call__(
        self,
        character_id: str,
        payload: CastingGenerateRequest,
    ) -> GeneratedIdentityImage:
        settings = self.settings_provider()
        profile = settings.character_master_workflow_profile
        if profile is None or not profile.is_file():
            raise CastingGeneratorUnavailable(
                "No character-master workflow is configured; import remains available"
            )
        activity_store = StudioActivityStore(settings.output_dir)
        activity = activity_store.start(
            title=f"Casting · {character_id}",
            message="Préparation du master personnage",
            graph=ActivityGraphTarget(
                scope="series",
                id="series",
                node_id="series:cast",
            ),
            stages=["prepare", "generate", "download"],
        )
        active_stage = "prepare"
        activity_store.update(
            activity.id,
            stage=active_stage,
            status=StageStatus.RUNNING,
            message="Chargement du workflow de casting",
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
                    "one subject, one view, single character portrait, simple painted background"
                    if payload.kind.value == "portrait"
                    else (
                        "one subject, one view, complete character visible from head to feet, "
                        "full body standing pose, simple painted background"
                    )
                ),
                (
                    "hand-painted 2D animated film, expressive cartoon design, "
                    "clean readable silhouette, coherent anatomy, production character master"
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
                active_stage = "generate"
                activity_store.update(
                    activity.id,
                    stage=active_stage,
                    status=StageStatus.RUNNING,
                    message="ComfyUI calcule le master cartoon",
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
                        "steps": 4,
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
                active_stage = "download"
                activity_store.update(
                    activity.id,
                    stage=active_stage,
                    status=StageStatus.RUNNING,
                    message="Récupération du candidat dans le Studio",
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
                generated = GeneratedIdentityImage(
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
                activity_store.complete(activity.id, "Candidat visuel prêt à valider")
                return generated
        except CastingGeneratorUnavailable as exc:
            activity_store.fail(activity.id, stage=active_stage, message=str(exc))
            raise
        except (
            httpx.HTTPError,
            OSError,
            ComfyProtocolError,
            ComfyTimeoutError,
            WorkflowConfigurationError,
        ) as exc:
            message = f"Casting generation failed: {exc}; import remains available"
            activity_store.fail(activity.id, stage=active_stage, message=message)
            raise CastingGeneratorUnavailable(
                message
            ) from exc
