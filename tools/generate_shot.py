from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
from typing import Any

from engine.config import Settings
from engine.director.models import Shot
from engine.director.prompt_builder import PromptBuilder
from engine.generation.comfy.client import ComfyClient
from engine.generation.comfy.workflow_loader import WorkflowLoader
from engine.generation.comfy.workflow_mapper import WorkflowMapper
from engine.production.shot_pipeline import ShotPipeline, ShotPipelineOptions


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Generate one reproducible shot through ComfyUI")
    result.add_argument("shot", type=Path, help="Path to the semantic Shot JSON")
    result.add_argument("--keyframe-profile", type=Path)
    result.add_argument("--keyframe-guide-profile", type=Path)
    result.add_argument("--video-profile", type=Path)
    result.add_argument("--output-dir", type=Path)
    result.add_argument("--keyframe-only", action="store_true")
    result.add_argument("--from-keyframe", type=Path)
    result.add_argument("--continuity-keyframe", type=Path)
    result.add_argument(
        "--guide-keyframe",
        action="append",
        type=Path,
        default=[],
        help="Pose supplémentaire à imposer au milieu puis à la fin du plan (maximum 2)",
    )
    result.add_argument("--force", action="store_true")
    result.add_argument("--dry-run", action="store_true")
    return result


def _profile(value: Path | None, name: str) -> Path:
    if value is None:
        raise SystemExit(
            f"Missing {name}. Set it in .env or pass the corresponding command-line option."
        )
    return value


def _base_context(shot: Shot, prompt: str, negative: str) -> dict[str, Any]:
    frames = shot.render.frames or 9
    return {
        "prompt": prompt,
        "negative_prompt": negative,
        "seed": shot.render.seed,
        "width": shot.render.width,
        "height": shot.render.height,
        "frames": shot.render.frames,
        "fps": shot.render.fps,
        "output_prefix": shot.id,
        "reference_image": "approved-keyframe.png",
        "reference_image_guide_1": "approved-keyframe-guide-1.png",
        "reference_image_guide_2": "approved-keyframe-guide-2.png",
        "guide_frame_1": 8 * round((frames / 2) / 8),
        "guide_frame_2": frames - 1,
        "reference_images": {
            character.id: [
                f"reference-{character.id}-{index}.png"
                for index, _ in enumerate(character.reference_images)
            ]
            for character in shot.characters
        },
    }


def dry_run(shot_path: Path, output_dir: Path, keyframe: Path, video: Path) -> Path:
    shot = Shot.model_validate_json(shot_path.read_text(encoding="utf-8"))
    prompt = PromptBuilder().build(shot)
    context = _base_context(shot, prompt.positive, prompt.negative)
    loader = WorkflowLoader()
    mapper = WorkflowMapper()
    destination = output_dir / shot.id / "dry-run"
    destination.mkdir(parents=True, exist_ok=True)
    for label, profile_path in (("keyframe", keyframe), ("video", video)):
        loaded = loader.load(profile_path)
        mapped = mapper.map(loaded, context)
        (destination / f"{label}.mapped.json").write_text(
            json.dumps(mapped, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    (destination / "prompt.txt").write_text(
        prompt.positive + "\n\nNEGATIVE:\n" + prompt.negative + "\n", encoding="utf-8"
    )
    return destination


async def _run(args: argparse.Namespace) -> None:
    settings = Settings()
    keyframe_profile = _profile(
        args.keyframe_profile or settings.keyframe_workflow_profile,
        "keyframe workflow profile",
    )
    video_profile = _profile(
        args.video_profile or settings.video_workflow_profile,
        "video workflow profile",
    )
    keyframe_guide_profile = _profile(
        args.keyframe_guide_profile or settings.keyframe_guide_workflow_profile,
        "keyframe guide workflow profile",
    )
    output_dir = args.output_dir or settings.output_dir
    if args.keyframe_only and args.from_keyframe:
        raise SystemExit("--keyframe-only and --from-keyframe cannot be used together")
    if args.dry_run:
        destination = dry_run(args.shot, output_dir, keyframe_profile, video_profile)
        print(f"Dry-run ready: {destination}")
        return

    async with ComfyClient(
        str(settings.comfyui_url),
        request_timeout_seconds=settings.comfyui_timeout_seconds,
        poll_interval_seconds=settings.comfyui_poll_interval_seconds,
    ) as client:
        pipeline = ShotPipeline(client)
        record = await pipeline.run(
            ShotPipelineOptions(
                shot_path=args.shot,
                output_root=output_dir,
                keyframe_profile=keyframe_profile,
                keyframe_guide_profile=keyframe_guide_profile,
                video_profile=video_profile,
                keyframe_only=args.keyframe_only,
                from_keyframe=args.from_keyframe,
                continuity_keyframe=args.continuity_keyframe,
                guide_keyframes=tuple(args.guide_keyframe),
                force=args.force,
                timeout_seconds=settings.comfyui_timeout_seconds,
            )
        )
    print(f"{record.status}: {output_dir / record.shot_id}")


def main() -> None:
    args = parser().parse_args()
    asyncio.run(_run(args))


if __name__ == "__main__":
    main()
