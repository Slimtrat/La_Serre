"""Render a reviewable character reference with the bundled FLUX Schnell workflow."""

from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from engine.config import Settings
from engine.generation.comfy.client import ComfyClient
from engine.generation.comfy.executor import ComfyWorkflowExecutor

PROFILE = Path("workflows/templates/flux-schnell-character-master-v1/profile.json")


async def render(args: argparse.Namespace) -> None:
    settings = Settings()
    if args.output.exists() and not args.force:
        raise FileExistsError(f"Output already exists: {args.output}; pass --force to replace it")
    async with ComfyClient(
        str(settings.comfyui_url),
        request_timeout_seconds=settings.comfyui_timeout_seconds,
        poll_interval_seconds=settings.comfyui_poll_interval_seconds,
    ) as client:
        result = await ComfyWorkflowExecutor(client).execute(
            args.profile,
            {
                "prompt": args.prompt,
                "seed": args.seed,
                "width": args.width,
                "height": args.height,
                "steps": args.steps,
                "output_prefix": args.output.stem,
            },
            timeout_seconds=settings.comfyui_timeout_seconds,
        )
        images = [item for item in result.outputs if item.suffix == ".png"]
        if len(images) != 1:
            raise RuntimeError(f"Expected one PNG from FLUX, got {len(images)}")
        await client.download_output(images[0], args.output)
    print(f"Generated reference: {args.output} (ComfyUI prompt {result.prompt_id})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--profile", type=Path, default=PROFILE)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--width", type=int, default=768)
    parser.add_argument("--height", type=int, default=1024)
    parser.add_argument("--steps", type=int, default=4)
    parser.add_argument("--force", action="store_true")
    asyncio.run(render(parser.parse_args()))


if __name__ == "__main__":
    main()
