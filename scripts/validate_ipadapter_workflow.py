from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from engine.config import Settings
from engine.generation.comfy.client import ComfyClient
from engine.generation.comfy.executor import ComfyWorkflowExecutor
from engine.observability.studio_activity import (
    ActivityGraphTarget,
    StageStatus,
    StudioActivityStore,
)


async def generate(args: argparse.Namespace) -> None:
    reference = args.reference.resolve() if args.reference else None
    if reference is not None and not reference.is_file():
        raise FileNotFoundError(reference)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    store = StudioActivityStore(Settings.load().output_dir)
    activity = store.start(
        title=args.activity_title,
        message="Préparation de la génération visuelle",
        graph=ActivityGraphTarget(
            scope=args.activity_scope,
            id=args.activity_graph_id,
            node_id=args.activity_node,
        ),
        stages=["prepare", "reference", "generate", "download"],
    )
    active_stage = "prepare"
    store.update(
        activity.id,
        stage=active_stage,
        status=StageStatus.RUNNING,
        message="Connexion au moteur ComfyUI",
    )
    try:
        async with ComfyClient(args.url) as client:
            active_stage = "reference"
            store.update(
                activity.id,
                stage=active_stage,
                status=StageStatus.RUNNING,
                message="Chargement de la référence" if reference else "Aucune référence requise",
            )
            uploaded = await client.upload_image(reference) if reference else None
            context = {
                "prompt": args.prompt,
                "negative_prompt": args.negative_prompt,
                "seed": args.seed,
                "width": args.width,
                "height": args.height,
                "output_prefix": "Serre/visual-gate/reference-candidate",
            }
            if uploaded is not None:
                context["reference_image"] = uploaded.workflow_reference
            active_stage = "generate"
            store.update(
                activity.id,
                stage=active_stage,
                status=StageStatus.RUNNING,
                message="ComfyUI calcule l’image",
            )
            execution = await ComfyWorkflowExecutor(client).execute(
                args.profile
                or Path(
                    "workflows/local/keyframe-reference.profile.json"
                    if reference
                    else "workflows/local/keyframe.profile.json"
                ),
                context,
                timeout_seconds=1800,
            )
            image = next(
                output
                for output in execution.outputs
                if output.suffix in {".png", ".jpg", ".jpeg", ".webp"}
            )
            active_stage = "download"
            store.update(
                activity.id,
                stage=active_stage,
                status=StageStatus.RUNNING,
                message="Import du résultat dans le Studio",
            )
            await client.download_output(image, args.output)
            store.complete(activity.id, "Image disponible dans le Studio")
            print(f"{execution.prompt_id} {args.output.resolve()}")
    except Exception as exc:
        store.fail(activity.id, stage=active_stage, message=str(exc))
        raise


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser()
    result.add_argument("--reference", type=Path)
    result.add_argument("--output", type=Path, required=True)
    result.add_argument("--prompt", required=True)
    result.add_argument(
        "--negative-prompt",
        default=(
            "photorealism, human skin, human hair, ordinary clothes, live action, "
            "duplicate character, extra limbs, text, watermark, character sheet, multiple panels"
        ),
    )
    result.add_argument(
        "--profile",
        type=Path,
        default=None,
    )
    result.add_argument("--url", default="http://127.0.0.1:8188")
    result.add_argument("--seed", type=int, default=384723)
    result.add_argument("--width", type=int, default=576)
    result.add_argument("--height", type=int, default=1024)
    result.add_argument("--activity-title", default="Génération visuelle locale")
    result.add_argument("--activity-scope", choices=("series", "episode", "shot"), default="series")
    result.add_argument("--activity-graph-id", default="series")
    result.add_argument("--activity-node", default="series:cast")
    return result


if __name__ == "__main__":
    asyncio.run(generate(parser().parse_args()))
