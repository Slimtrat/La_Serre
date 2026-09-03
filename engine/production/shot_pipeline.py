from __future__ import annotations

import shutil
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from engine.director.models import Shot
from engine.director.prompt_builder import PromptBuilder, PromptPackage
from engine.generation.comfy.client import ComfyClient, ComfyOutput
from engine.generation.comfy.errors import ComfyProtocolError
from engine.generation.comfy.executor import ComfyWorkflowExecutor, WorkflowExecution
from engine.generation.models import (
    GenerationRecord,
    GenerationState,
    OutputArtifact,
    ReferenceRecord,
    StageRecord,
)
from engine.generation.video.base import VideoGenerationRequest, VideoGenerationResult
from engine.generation.video.ltx import LTXVideoGenerator
from engine.production.artifacts import artifact, sha256_file, write_record, write_text_atomic

IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}
VIDEO_SUFFIXES = {".mp4", ".webm", ".mov", ".mkv"}
ProgressCallback = Callable[[str, str, str], None]


@dataclass(frozen=True, slots=True)
class ShotPipelineOptions:
    shot_path: Path
    output_root: Path
    keyframe_profile: Path
    video_profile: Path
    keyframe_only: bool = False
    from_keyframe: Path | None = None
    force: bool = False
    timeout_seconds: float = 1800


class ShotPipeline:
    def __init__(
        self,
        client: ComfyClient,
        prompt_builder: PromptBuilder | None = None,
        on_progress: ProgressCallback | None = None,
    ) -> None:
        self.client = client
        self.prompt_builder = prompt_builder or PromptBuilder()
        self.on_progress = on_progress
        self.executor = ComfyWorkflowExecutor(client)
        self.video = LTXVideoGenerator(client, self.executor)

    async def run(self, options: ShotPipelineOptions) -> GenerationRecord:
        shot = Shot.model_validate_json(options.shot_path.read_text(encoding="utf-8"))
        self._notify("input", "completed", f"{shot.id} validé")
        self._notify("prompt", "running", "Construction du prompt sémantique")
        prompt = self.prompt_builder.build(shot)
        self._notify("prompt", "completed", "Prompt positif et négatif prêts")
        destination = options.output_root / shot.id
        self._prepare_destination(destination, options.force, options.from_keyframe)
        destination.mkdir(parents=True, exist_ok=True)
        prompt_text = prompt.positive + "\n\nNEGATIVE:\n" + prompt.negative + "\n"
        write_text_atomic(destination / "prompt.txt", prompt_text)

        record = self._new_record(shot, prompt, options)
        manifest_path = destination / "generation.json"
        write_record(manifest_path, record)
        try:
            self._notify("references", "running", "Préparation des références visuelles")
            reference_context, references = await self._upload_references(shot, options.shot_path)
            self._notify(
                "references",
                "completed",
                f"{len(references)} référence(s) chargée(s)",
            )
            record.input["references"] = [item.model_dump(mode="json") for item in references]
            context = self._context(shot, prompt, reference_context)
            keyframe_path = destination / "keyframe.png"

            if options.from_keyframe:
                source = options.from_keyframe.expanduser().resolve()
                if not source.is_file():
                    raise FileNotFoundError(f"Approved keyframe does not exist: {source}")
                if source != keyframe_path.resolve():
                    shutil.copyfile(source, keyframe_path)
                self._notify("keyframe", "completed", "Keyframe approuvée réutilisée")
            else:
                self._notify("keyframe", "running", "Génération ComfyUI en cours")
                image_execution = await self.executor.execute(
                    options.keyframe_profile,
                    context,
                    timeout_seconds=options.timeout_seconds,
                )
                image_output = self._select_output(image_execution.outputs, IMAGE_SUFFIXES, "image")
                await self.client.download_output(image_output, keyframe_path)
                record.stages.append(self._stage_from_image(shot, image_execution, keyframe_path))
                self._notify("keyframe", "completed", "Keyframe téléchargée")

            keyframe_artifact = artifact(keyframe_path, "image/png")
            self._replace_output(record, keyframe_artifact)
            if options.keyframe_only:
                self._notify("video", "skipped", "En attente de validation humaine")
                record.status = GenerationState.AWAITING_KEYFRAME_APPROVAL
                record.completed_at = datetime.now(UTC)
                write_record(manifest_path, record)
                return record

            self._notify("video", "running", "Animation LTX image-to-video")
            result = await self.video.generate(
                VideoGenerationRequest(
                    keyframe=keyframe_path,
                    profile_path=options.video_profile,
                    context=context,
                    timeout_seconds=options.timeout_seconds,
                )
            )
            video_output = self._select_output(result.outputs, VIDEO_SUFFIXES, "video")
            clip_path = destination / "clip.mp4"
            await self.client.download_output(video_output, clip_path)
            clip_artifact = artifact(clip_path, "video/mp4")
            record.stages.append(self._stage_from_video(shot, result, clip_artifact))
            self._notify("video", "completed", "Clip vidéo téléchargé")
            self._replace_output(record, clip_artifact)
            record.status = GenerationState.GENERATED
            record.completed_at = datetime.now(UTC)
            write_record(manifest_path, record)
            self._notify("artifacts", "completed", "Manifest et médias prêts")
            return record
        except Exception as exc:
            record.status = GenerationState.FAILED
            record.error = f"{type(exc).__name__}: {exc}"
            record.completed_at = datetime.now(UTC)
            write_record(manifest_path, record)
            self._notify("artifacts", "failed", str(exc))
            raise

    def _notify(self, stage: str, status: str, message: str) -> None:
        if self.on_progress:
            self.on_progress(stage, status, message)

    @staticmethod
    def _new_record(
        shot: Shot, prompt: PromptPackage, options: ShotPipelineOptions
    ) -> GenerationRecord:
        return GenerationRecord(
            id=f"gen_{uuid.uuid4().hex}",
            shot_id=shot.id,
            backend="ltx",
            status=GenerationState.GENERATING,
            created_at=datetime.now(UTC),
            seed=shot.render.seed,
            input={
                "shot_source": str(options.shot_path.resolve()),
                "shot": shot.model_dump(mode="json"),
                "prompt": prompt.model_dump(mode="json"),
                "render": shot.render.model_dump(mode="json"),
                "keyframe_profile": str(options.keyframe_profile.resolve()),
                "video_profile": str(options.video_profile.resolve()),
                "from_keyframe": str(options.from_keyframe.resolve())
                if options.from_keyframe
                else None,
            },
        )

    async def _upload_references(
        self, shot: Shot, shot_path: Path
    ) -> tuple[dict[str, list[str]], list[ReferenceRecord]]:
        uploaded_context: dict[str, list[str]] = {}
        records: list[ReferenceRecord] = []
        for character in shot.characters:
            uploaded_context[character.id] = []
            for reference in character.reference_images:
                source = reference if reference.is_absolute() else shot_path.parent / reference
                source = source.resolve()
                uploaded = await self.client.upload_image(source)
                uploaded_context[character.id].append(uploaded.workflow_reference)
                records.append(
                    ReferenceRecord(
                        character_id=character.id,
                        source_path=source,
                        sha256=sha256_file(source),
                        comfyui_name=uploaded.workflow_reference,
                    )
                )
        return uploaded_context, records

    @staticmethod
    def _context(
        shot: Shot,
        prompt: PromptPackage,
        reference_images: dict[str, list[str]],
    ) -> dict[str, Any]:
        return {
            "prompt": prompt.positive,
            "negative_prompt": prompt.negative,
            "seed": shot.render.seed,
            "width": shot.render.width,
            "height": shot.render.height,
            "frames": shot.render.frames,
            "fps": shot.render.fps,
            "output_prefix": shot.id,
            "reference_images": reference_images,
        }

    @staticmethod
    def _select_output(
        outputs: list[ComfyOutput], suffixes: set[str], expected: str
    ) -> ComfyOutput:
        for output in outputs:
            if output.suffix in suffixes:
                return output
        available = ", ".join(output.filename for output in outputs) or "none"
        raise ComfyProtocolError(f"Workflow returned no {expected} output; available: {available}")

    def _stage_from_image(
        self, shot: Shot, execution: WorkflowExecution, path: Path
    ) -> StageRecord:
        return StageRecord(
            name="keyframe",
            backend="comfyui",
            workflow_id=execution.loaded.profile.id,
            workflow_sha256=execution.loaded.sha256,
            prompt_id=execution.prompt_id,
            seed=shot.render.seed,
            status="completed",
            outputs=[artifact(path, "image/png")],
        )

    @staticmethod
    def _stage_from_video(
        shot: Shot, result: VideoGenerationResult, artifact: OutputArtifact
    ) -> StageRecord:
        return StageRecord(
            name="video",
            backend="ltx",
            workflow_id=result.workflow.profile.id,
            workflow_sha256=result.workflow.sha256,
            prompt_id=result.generation_id,
            seed=shot.render.seed,
            status="completed",
            outputs=[artifact],
        )

    @staticmethod
    def _prepare_destination(destination: Path, force: bool, from_keyframe: Path | None) -> None:
        if not destination.exists():
            return
        harmless_files = {"dry-run", "imports"}
        allowed_resume_files = {"keyframe.png", "generation.json", "prompt.txt"}
        existing = {item.name for item in destination.iterdir()}
        if existing <= harmless_files:
            return
        if from_keyframe and existing <= allowed_resume_files | harmless_files:
            return
        if force:
            preserved_keyframe = (
                from_keyframe
                and from_keyframe.resolve() == (destination / "keyframe.png").resolve()
            )
            for name in allowed_resume_files | {"clip.mp4"}:
                if preserved_keyframe and name == "keyframe.png":
                    continue
                candidate = destination / name
                if candidate.is_file():
                    candidate.unlink()
            return
        raise FileExistsError(
            f"Output already exists at {destination}; use --force to replace generated files"
        )

    @staticmethod
    def _replace_output(record: GenerationRecord, artifact: OutputArtifact) -> None:
        record.outputs = [item for item in record.outputs if item.path != artifact.path]
        record.outputs.append(artifact)
