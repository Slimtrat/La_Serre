from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

from PIL import Image

from engine.director.models import Shot, ShotCharacter
from engine.generation.comfy.client import ComfyClient
from engine.generation.comfy.executor import ComfyWorkflowExecutor
from engine.observability.studio_activity import (
    ActivityGraphTarget,
    StageStatus,
    StudioActivityStore,
)

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / ".private"
OUTPUT = ROOT / "output"
LAYERS = OUTPUT / "S01E001" / "animatic" / "layers"
SHOT_PATH = PRIVATE / "episodes" / "season-01" / "S01E001" / "shots" / "S01E001-S10.json"


def _context_for_sprite(
    character: ShotCharacter,
    reference: str,
    *,
    seed: int,
) -> dict[str, Any]:
    details = ", ".join(character.signature_details)
    regional_prompt = (
        f"{character.name}, exactly one full botanical cartoon character, complete body "
        f"visible from top to roots. {character.visual_description}. {character.wardrobe}. "
        f"Signature details: {details}. Neutral readable pose, clean silhouette."
    )
    return {
        "prompt": (
            "Character sprite sheet source, exactly one full-body subject centered, generous "
            "margin around the silhouette, pure uniform white background, no floor, no shadow, "
            "no scenery, polished 2D cartoon, painterly cel shading"
        ),
        "negative_prompt": (
            "greenhouse, garden, plants, flowers, scenery, gradient background, gray background, "
            "colored background, floor, pedestal, cast shadow, multiple characters, duplicate "
            "body, extra head, cropped body, text, logo, watermark, photorealism"
        ),
        "seed": seed,
        "width": 512,
        "height": 768,
        "output_prefix": f"Serre/animatic/{character.id}",
        "character_reference_image_1": reference,
        "character_reference_image_2": reference,
        "character_reference_image_3": reference,
        "character_reference_weight_1": 0.78,
        "character_reference_weight_2": 0.0,
        "character_reference_weight_3": 0.0,
        "character_reference_mask_width_1": 512,
        "character_reference_mask_width_2": 1,
        "character_reference_mask_width_3": 1,
        "character_reference_mask_x_1": 0,
        "character_reference_mask_x_2": 0,
        "character_reference_mask_x_3": 0,
        "character_reference_prompt_1": regional_prompt,
        "character_reference_prompt_2": "",
        "character_reference_prompt_3": "",
        "character_reference_prompt_strength_1": 1.1,
        "character_reference_prompt_strength_2": 0.0,
        "character_reference_prompt_strength_3": 0.0,
    }


def _cut_white_background(source: Path, destination: Path) -> None:
    with Image.open(source) as opened:
        image = opened.convert("RGBA")
    pixels = []
    for red, green, blue, _alpha in image.getdata():
        minimum = min(red, green, blue)
        maximum = max(red, green, blue)
        chroma = maximum - minimum
        if minimum >= 245 and chroma <= 18:
            alpha = 0
        elif minimum >= 215 and chroma <= 32:
            alpha = max(0, min(255, round((245 - minimum) * 255 / 30)))
        else:
            alpha = 255
        pixels.append((red, green, blue, alpha))
    image.putdata(pixels)
    box = image.getchannel("A").getbbox()
    if box is None:
        raise RuntimeError(f"Détourage vide pour {source}")
    image.crop(box).save(destination, format="PNG", optimize=True)


async def _generate() -> None:
    LAYERS.mkdir(parents=True, exist_ok=True)
    shot = Shot.model_validate_json(SHOT_PATH.read_text(encoding="utf-8"))
    characters = {character.id: character for character in shot.characters}
    store = StudioActivityStore(OUTPUT)
    activity = store.start(
        title="Tentafruit · animatique V1",
        message="Préparation des calques cohérents",
        graph=ActivityGraphTarget(
            scope="episode",
            id="S01E001",
            node_id="episode:S01E001",
        ),
        stages=["background", "sprites", "composition", "verification"],
    )
    active_stage = "background"
    try:
        async with ComfyClient("http://127.0.0.1:8188") as client:
            executor = ComfyWorkflowExecutor(client)
            store.update(
                activity.id,
                stage="background",
                status=StageStatus.RUNNING,
                message="ComfyUI génère la serre vide de l’animatique",
            )
            background_execution = await executor.execute(
                ROOT / "workflows" / "local" / "keyframe.profile.json",
                {
                    "prompt": (
                        "empty nocturnal Victorian poison greenhouse interior, black wrought "
                        "iron ribs, fogged glass roof, huge moon, tangled vines and toxic "
                        "flowers framing the far edges, clear empty marble floor and pedestal "
                        "area in the center, deep perspective, polished 2D cartoon, painterly "
                        "cel shading, vertical cinematic composition, no character"
                    ),
                    "negative_prompt": (
                        "person, character, face, body, creature, chest, cabinet, furniture, "
                        "text, logo, watermark, split screen, collage, photorealism"
                    ),
                    "seed": 820001,
                    "width": 576,
                    "height": 1024,
                    "output_prefix": "Serre/animatic/greenhouse",
                },
                timeout_seconds=1800,
            )
            background_output = next(
                item
                for item in background_execution.outputs
                if item.suffix in {".png", ".jpg", ".jpeg", ".webp"}
            )
            await client.download_output(background_output, LAYERS / "greenhouse.png")

            active_stage = "sprites"
            store.update(
                activity.id,
                stage="sprites",
                status=StageStatus.RUNNING,
                message="ComfyUI isole les trois masters approuvés",
            )
            seeds = {"belladone": 820011, "graine-noire": 820012, "aconit": 820013}
            for character_id in ("belladone", "graine-noire", "aconit"):
                character = characters[character_id]
                source = character.reference_images[0]
                if not source.is_absolute():
                    source = (SHOT_PATH.parent / source).resolve()
                uploaded = await client.upload_image(source)
                execution = await executor.execute(
                    ROOT / "workflows" / "local" / "keyframe-reference.profile.json",
                    _context_for_sprite(
                        character,
                        uploaded.workflow_reference,
                        seed=seeds[character_id],
                    ),
                    timeout_seconds=1800,
                )
                output = next(
                    item
                    for item in execution.outputs
                    if item.suffix in {".png", ".jpg", ".jpeg", ".webp"}
                )
                raw = LAYERS / f"{character_id}-raw.png"
                await client.download_output(output, raw)
                _cut_white_background(raw, LAYERS / f"{character_id}.png")
                store.update(
                    activity.id,
                    stage="sprites",
                    status=StageStatus.RUNNING,
                    message=f"Silhouette {character.name} prête",
                )
        store.update(
            activity.id,
            stage="composition",
            status=StageStatus.RUNNING,
            message="Calques prêts pour le contrôle avant composition",
        )
        (LAYERS / "layers.json").write_text(
            json.dumps(
                {
                    "background": "greenhouse.png",
                    "sprites": ["belladone.png", "graine-noire.png", "aconit.png"],
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        store.complete(activity.id, "Fond et silhouettes prêts à contrôler")
    except Exception as exc:
        store.fail(activity.id, stage=active_stage, message=str(exc))
        raise


if __name__ == "__main__":
    asyncio.run(_generate())
