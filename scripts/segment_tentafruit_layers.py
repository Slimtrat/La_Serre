from __future__ import annotations

import asyncio
from pathlib import Path

from PIL import Image, ImageFilter

from engine.generation.comfy.client import ComfyClient
from engine.observability.studio_activity import (
    ActivityGraphTarget,
    StageStatus,
    StudioActivityStore,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output"
LAYERS = OUTPUT / "S01E001" / "animatic" / "layers"


def _workflow(image_reference: str, prefix: str) -> dict[str, object]:
    return {
        "1": {
            "class_type": "LoadBackgroundRemovalModel",
            "inputs": {"bg_removal_name": "birefnet.safetensors"},
        },
        "2": {
            "class_type": "LoadImage",
            "inputs": {"image": image_reference},
        },
        "3": {
            "class_type": "RemoveBackground",
            "inputs": {"bg_removal_model": ["1", 0], "image": ["2", 0]},
        },
        "4": {
            "class_type": "MaskToImage",
            "inputs": {"mask": ["3", 0]},
        },
        "5": {
            "class_type": "SaveImage",
            "inputs": {"images": ["4", 0], "filename_prefix": prefix},
        },
    }


def _apply_mask(source: Path, mask_path: Path, destination: Path) -> None:
    with Image.open(source) as opened:
        image = opened.convert("RGBA")
    with Image.open(mask_path) as opened:
        mask = opened.convert("L").resize(image.size, Image.Resampling.LANCZOS)
    mask = mask.point(lambda value: 0 if value < 22 else value)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=0.7))
    image.putalpha(mask)
    box = image.getchannel("A").getbbox()
    if box is None:
        raise RuntimeError(f"BiRefNet returned an empty mask for {source}")
    image.crop(box).save(destination, format="PNG", optimize=True)


async def _run() -> None:
    store = StudioActivityStore(OUTPUT)
    activity = store.start(
        title="Tentafruit · animatique V1",
        message="Détourage local des personnages",
        graph=ActivityGraphTarget(
            scope="episode",
            id="S01E001",
            node_id="episode:S01E001",
        ),
        stages=["segmentation", "verification"],
    )
    active_stage = "segmentation"
    try:
        store.update(
            activity.id,
            stage="segmentation",
            status=StageStatus.RUNNING,
            message="BiRefNet détoure Belladone, Graine Noire et Aconit",
        )
        async with ComfyClient("http://127.0.0.1:8188") as client:
            for character_id in ("belladone", "graine-noire", "aconit"):
                source = LAYERS / f"{character_id}-raw.png"
                uploaded = await client.upload_image(source, overwrite=True)
                prompt_id = await client.submit_workflow(
                    _workflow(uploaded.workflow_reference, f"Serre/masks/{character_id}")
                )
                await client.wait(prompt_id, timeout_seconds=900)
                outputs = await client.get_outputs(prompt_id)
                output = next(item for item in outputs if item.suffix == ".png")
                mask_path = LAYERS / f"{character_id}-birefnet-mask.png"
                await client.download_output(output, mask_path)
                _apply_mask(source, mask_path, LAYERS / f"{character_id}.png")
                store.update(
                    activity.id,
                    stage="segmentation",
                    status=StageStatus.RUNNING,
                    message=f"{character_id} détouré",
                )

        active_stage = "verification"
        store.update(
            activity.id,
            stage="verification",
            status=StageStatus.RUNNING,
            message="Silhouettes prêtes pour la composition des dix plans",
        )
        store.complete(activity.id, "Trois personnages détourés localement")
    except Exception as exc:
        store.fail(activity.id, stage=active_stage, message=str(exc))
        raise


if __name__ == "__main__":
    asyncio.run(_run())
