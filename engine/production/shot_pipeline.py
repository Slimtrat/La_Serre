from __future__ import annotations

import shutil
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from engine.director.models import Shot, ShotCharacter
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
from engine.world.visual_identity import VisualIdentityRegistry

IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}
VIDEO_SUFFIXES = {".mp4", ".webm", ".mov", ".mkv"}
ProgressCallback = Callable[[str, str, str], None]


@dataclass(frozen=True, slots=True)
class ShotPipelineOptions:
    shot_path: Path
    output_root: Path
    keyframe_profile: Path
    video_profile: Path
    keyframe_reference_profile: Path | None = None
    keyframe_guide_profile: Path | None = None
    keyframe_reference_guide_profile: Path | None = None
    keyframe_only: bool = False
    from_keyframe: Path | None = None
    continuity_keyframe: Path | None = None
    guide_keyframes: tuple[Path, ...] = ()
    force: bool = False
    timeout_seconds: float = 1800
    keyframe_width: int | None = None
    keyframe_height: int | None = None


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
        shot_path = options.shot_path.resolve()
        shot = Shot.model_validate_json(shot_path.read_text(encoding="utf-8"))
        episodes_dir = next(
            (parent for parent in shot_path.parents if parent.name == "episodes"),
            None,
        )
        if episodes_dir is not None:
            shot = VisualIdentityRegistry(episodes_dir.parent).resolve_shot_references(shot)
        for label, dimension in (
            ("keyframe_width", options.keyframe_width),
            ("keyframe_height", options.keyframe_height),
        ):
            if dimension is not None and (dimension < 256 or dimension % 8):
                raise ValueError(f"{label} must be at least 256 and divisible by 8")
        if len(options.guide_keyframes) > 2:
            raise ValueError("LTX accepte au maximum deux poses guides en plus de l'image initiale")
        self._notify("input", "completed", f"{shot.id} validé")
        self._notify("prompt", "running", "Construction du prompt sémantique")
        prompt = self.prompt_builder.build(shot)
        self._notify("prompt", "completed", "Prompt positif et négatif prêts")
        destination = options.output_root / shot.id
        self._prepare_destination(
            destination,
            options.force,
            options.from_keyframe,
            options.guide_keyframes,
        )
        destination.mkdir(parents=True, exist_ok=True)
        prompt_text = prompt.positive + "\n\nNEGATIVE:\n" + prompt.negative + "\n"
        write_text_atomic(destination / "prompt.txt", prompt_text)

        record = self._new_record(shot, prompt, options)
        manifest_path = destination / "generation.json"
        write_record(manifest_path, record)
        try:
            self._notify("references", "running", "Préparation des références visuelles")
            reference_context, references, character_references = await self._upload_references(
                shot, options.shot_path, destination
            )
            self._notify(
                "references",
                "completed",
                f"{len(references)} référence(s) chargée(s)",
            )
            record.input["references"] = [item.model_dump(mode="json") for item in references]
            context = self._context(shot, prompt, reference_context)
            if character_references:
                # Compatibility with user-supplied single-reference profiles.
                context["reference_image"] = character_references[0]
            keyframe_path = destination / "keyframe.png"
            guide_paths: list[Path] = []

            if options.from_keyframe:
                source = options.from_keyframe.expanduser().resolve()
                if not source.is_file():
                    raise FileNotFoundError(f"Approved keyframe does not exist: {source}")
                if source != keyframe_path.resolve():
                    shutil.copyfile(source, keyframe_path)
                self._notify("keyframe", "completed", "Keyframe approuvée réutilisée")
            else:
                scripted_beats = shot.visual_beats if not options.guide_keyframes else []
                targets: list[tuple[Path, str, str | None]] = [
                    (
                        keyframe_path,
                        "keyframe-start" if scripted_beats else "keyframe",
                        scripted_beats[0].description if scripted_beats else None,
                    )
                ]
                if scripted_beats:
                    targets.extend(
                        (
                            destination / f"keyframe-guide-{index}.png",
                            f"keyframe-{beat.id}",
                            beat.description,
                        )
                        for index, beat in enumerate(scripted_beats[1:], start=1)
                    )
                self._notify(
                    "keyframe",
                    "running",
                    f"Génération de {len(targets)} pose(s) ComfyUI",
                )
                previous_pose = options.continuity_keyframe
                if previous_pose is not None:
                    previous_pose = previous_pose.expanduser().resolve()
                    if not previous_pose.is_file():
                        raise FileNotFoundError(
                            f"Continuity keyframe does not exist: {previous_pose}"
                        )
                for index, (target, stage_name, beat_description) in enumerate(targets, start=1):
                    keyframe_context = dict(context)
                    keyframe_context["width"] = options.keyframe_width or shot.render.width
                    keyframe_context["height"] = options.keyframe_height or shot.render.height
                    if character_references:
                        self._apply_reference_layout(
                            keyframe_context, len(character_references)
                        )
                    if beat_description:
                        keyframe_context["prompt"] = self.prompt_builder.visual_beat_prompt(
                            prompt, beat_description
                        )
                        keyframe_context["output_prefix"] = f"{shot.id}-{stage_name}"
                    profile = options.keyframe_profile
                    if (
                        index == 1
                        and character_references
                        and options.keyframe_reference_profile is not None
                    ):
                        keyframe_context["prompt"] = self.prompt_builder.regional_scene_prompt(
                            shot, beat_description
                        )
                        profile = options.keyframe_reference_profile
                    elif (
                        previous_pose is not None
                        and character_references
                        and options.keyframe_reference_guide_profile is not None
                    ):
                        uploaded_pose = await self.client.upload_image(previous_pose)
                        keyframe_context["reference_image"] = uploaded_pose.workflow_reference
                        keyframe_context["prompt"] = self.prompt_builder.regional_scene_prompt(
                            shot, beat_description
                        )
                        profile = options.keyframe_reference_guide_profile
                    elif previous_pose is not None and options.keyframe_guide_profile is not None:
                        uploaded_pose = await self.client.upload_image(previous_pose)
                        keyframe_context["reference_image"] = uploaded_pose.workflow_reference
                        profile = options.keyframe_guide_profile
                    image_execution = await self.executor.execute(
                        profile,
                        keyframe_context,
                        timeout_seconds=options.timeout_seconds,
                    )
                    image_output = self._select_output(
                        image_execution.outputs, IMAGE_SUFFIXES, "image"
                    )
                    await self.client.download_output(image_output, target)
                    record.stages.append(
                        self._stage_from_image(shot, image_execution, target, stage_name=stage_name)
                    )
                    self._notify(
                        "keyframe",
                        "running",
                        f"Pose {index}/{len(targets)} disponible",
                    )
                    if target != keyframe_path:
                        guide_paths.append(target)
                    previous_pose = target
                if scripted_beats:
                    frames = shot.render.frames or 9
                    context["guide_frame_1"] = self._ltx_frame(frames, scripted_beats[1].at)
                    context["guide_frame_2"] = self._ltx_frame(frames, scripted_beats[2].at)
                self._notify("keyframe", "completed", f"{len(targets)} pose(s) téléchargée(s)")

            for index, guide in enumerate(options.guide_keyframes, start=1):
                source = guide.expanduser().resolve()
                if not source.is_file():
                    raise FileNotFoundError(f"Guide keyframe does not exist: {source}")
                guide_path = destination / f"keyframe-guide-{index}.png"
                if source != guide_path.resolve():
                    shutil.copyfile(source, guide_path)
                guide_paths.append(guide_path)

            keyframe_artifact = artifact(keyframe_path, "image/png")
            self._replace_output(record, keyframe_artifact)
            for guide_path in guide_paths:
                self._replace_output(record, artifact(guide_path, "image/png"))
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
                    guide_keyframes=tuple(guide_paths),
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
                "keyframe_reference_profile": (
                    str(options.keyframe_reference_profile.resolve())
                    if options.keyframe_reference_profile
                    else None
                ),
                "keyframe_reference_guide_profile": (
                    str(options.keyframe_reference_guide_profile.resolve())
                    if options.keyframe_reference_guide_profile
                    else None
                ),
                "video_profile": str(options.video_profile.resolve()),
                "keyframe_width": options.keyframe_width or shot.render.width,
                "keyframe_height": options.keyframe_height or shot.render.height,
                "from_keyframe": str(options.from_keyframe.resolve())
                if options.from_keyframe
                else None,
                "guide_keyframes": [str(path.resolve()) for path in options.guide_keyframes],
                "continuity_keyframe": (
                    str(options.continuity_keyframe.resolve())
                    if options.continuity_keyframe
                    else None
                ),
            },
        )

    async def _upload_references(
        self, shot: Shot, shot_path: Path, destination: Path
    ) -> tuple[dict[str, Any], list[ReferenceRecord], tuple[str, ...]]:
        del destination
        uploaded_context: dict[str, Any] = {}
        records: list[ReferenceRecord] = []
        character_slots: list[tuple[ShotCharacter, str]] = []
        for character in shot.characters:
            uploaded_context[character.id] = []
            primary_for_character: str | None = None
            for reference in character.reference_images:
                source = reference if reference.is_absolute() else shot_path.parent / reference
                source = source.resolve()
                uploaded = await self.client.upload_image(source)
                uploaded_context[character.id].append(uploaded.workflow_reference)
                primary_for_character = primary_for_character or uploaded.workflow_reference
                records.append(
                    ReferenceRecord(
                        character_id=character.id,
                        source_path=source,
                        sha256=sha256_file(source),
                        comfyui_name=uploaded.workflow_reference,
                    )
                )
            if primary_for_character is not None:
                character_slots.append((character, primary_for_character))

        limited_slots = character_slots[:3]
        limited = tuple(reference for _character, reference in limited_slots)
        if limited_slots:
            fallback_character, fallback_reference = limited_slots[0]
            padded_slots = limited_slots + [
                (fallback_character, fallback_reference)
            ] * (3 - len(limited_slots))
            for index, (slot_character, slot_reference) in enumerate(
                padded_slots, start=1
            ):
                uploaded_context[f"character_reference_image_{index}"] = slot_reference
                details = ", ".join(slot_character.signature_details)
                uploaded_context[f"character_reference_prompt_{index}"] = (
                    f"{slot_character.name}, exactly one separate full botanical body in this "
                    f"assigned region. {slot_character.visual_description}. "
                    f"{slot_character.wardrobe}. Signature details: {details}. "
                    f"Position: {slot_character.position}. Expression: "
                    f"{slot_character.emotion}. Never merge with another character."
                )
                cast_count = len(limited_slots)
                prompt_strength = {1: 1.0, 2: 0.72, 3: 0.58}[cast_count]
                uploaded_context[f"character_reference_prompt_strength_{index}"] = (
                    prompt_strength if index <= cast_count else 0.0
                )
            cast_count = len(limited)
            identity_weight = {1: 0.64, 2: 0.52, 3: 0.42}[cast_count]
            uploaded_context.update(
                {
                    "character_reference_weight_1": identity_weight,
                    "character_reference_weight_2": (
                        identity_weight if cast_count >= 2 else 0.0
                    ),
                    "character_reference_weight_3": (
                        identity_weight if cast_count >= 3 else 0.0
                    ),
                }
            )
        return uploaded_context, records, limited

    @staticmethod
    def _apply_reference_layout(context: dict[str, Any], count: int) -> None:
        width = int(context["width"])
        if count <= 1:
            regions = ((width, 0), (1, 0), (1, 0))
        elif count == 2:
            gap = max(24, width // 16)
            region_width = (width - gap) // 2
            regions = (
                (region_width, 0),
                (region_width, region_width + gap),
                (1, 0),
            )
        else:
            gap = max(16, width // 24)
            region_width = (width - 2 * gap) // 3
            regions = (
                (region_width, 0),
                (region_width, region_width + gap),
                (region_width, 2 * (region_width + gap)),
            )
        for index, (region_width, x) in enumerate(regions, start=1):
            context[f"character_reference_mask_width_{index}"] = region_width
            context[f"character_reference_mask_x_{index}"] = x

    @staticmethod
    def _context(
        shot: Shot,
        prompt: PromptPackage,
        reference_images: dict[str, Any],
    ) -> dict[str, Any]:
        frames = shot.render.frames or 9
        return {
            "prompt": prompt.positive,
            "negative_prompt": prompt.negative,
            "seed": shot.render.seed,
            "width": shot.render.width,
            "height": shot.render.height,
            "frames": shot.render.frames,
            "guide_frame_1": 8 * round((frames / 2) / 8),
            "guide_frame_2": frames - 1,
            "fps": shot.render.fps,
            "output_prefix": shot.id,
            "reference_images": {
                key: value
                for key, value in reference_images.items()
                if not key.startswith("character_reference_")
            },
            **{
                key: value
                for key, value in reference_images.items()
                if key.startswith("character_reference_")
            },
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
        self,
        shot: Shot,
        execution: WorkflowExecution,
        path: Path,
        *,
        stage_name: str = "keyframe",
    ) -> StageRecord:
        return StageRecord(
            name=stage_name,
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
    def _prepare_destination(
        destination: Path,
        force: bool,
        from_keyframe: Path | None,
        guide_keyframes: tuple[Path, ...] = (),
    ) -> None:
        if not destination.exists():
            return
        harmless_files = {"dry-run", "imports"}
        allowed_resume_files = {
            "keyframe.png",
            "keyframe-guide-1.png",
            "keyframe-guide-2.png",
            "generation.json",
            "prompt.txt",
        }
        existing = {item.name for item in destination.iterdir()}
        if existing <= harmless_files:
            return
        if from_keyframe and existing <= allowed_resume_files | harmless_files:
            return
        if force:
            preserved_sources = {
                source.resolve()
                for source in ((from_keyframe,) + guide_keyframes)
                if source is not None
            }
            for name in allowed_resume_files | {"clip.mp4"}:
                candidate = destination / name
                if candidate.resolve() in preserved_sources:
                    continue
                if candidate.is_file():
                    candidate.unlink()
            return
        raise FileExistsError(
            f"Output already exists at {destination}; use --force to replace generated files"
        )

    @staticmethod
    def _ltx_frame(frames: int, position: float) -> int:
        return min(frames - 1, max(0, 8 * round(((frames - 1) * position) / 8)))

    @staticmethod
    def _replace_output(record: GenerationRecord, artifact: OutputArtifact) -> None:
        record.outputs = [item for item in record.outputs if item.path != artifact.path]
        record.outputs.append(artifact)
