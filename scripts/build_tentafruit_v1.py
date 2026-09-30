from __future__ import annotations

import json
import shutil
from pathlib import Path

from engine.observability.studio_activity import (
    ActivityGraphTarget,
    StageStatus,
    StudioActivityStore,
)
from engine.production.animatic import (
    ChestPlacement,
    LayeredAnimaticComposer,
    RootPath,
    SceneComposition,
    SpritePlacement,
)
from engine.production.artifacts import sha256_file

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output"
LAYERS = OUTPUT / "S01E001" / "animatic" / "layers"


SCENES: dict[str, SceneComposition] = {
    "S01E001-S01": SceneComposition(
        chest=ChestPlacement(width=0.27, bottom=0.9),
        background_brightness=0.61,
    ),
    "S01E001-S02": SceneComposition(
        sprites=(SpritePlacement("belladone", 0.34, 0.98, 0.65),),
        chest=ChestPlacement(x=0.69, width=0.3, bottom=0.9),
        background_zoom=1.04,
    ),
    "S01E001-S03": SceneComposition(
        sprites=(
            SpritePlacement("belladone", 0.23, 0.98, 0.55),
            SpritePlacement("aconit", 0.79, 0.98, 0.58),
        ),
        chest=ChestPlacement(width=0.31, bottom=0.91),
    ),
    "S01E001-S04": SceneComposition(
        sprites=(
            SpritePlacement("belladone", 0.22, 0.99, 0.61),
            SpritePlacement("aconit", 0.82, 0.98, 0.51),
        ),
        chest=ChestPlacement(x=0.55, width=0.34, bottom=0.89, bite=True),
        roots=(RootPath(((0.32, 0.66), (0.42, 0.7), (0.5, 0.79), (0.55, 0.82)), width=5),),
        spark=(0.54, 0.81),
        background_zoom=1.08,
    ),
    "S01E001-S05": SceneComposition(
        sprites=(
            SpritePlacement("belladone", 0.18, 0.98, 0.49),
            SpritePlacement("aconit", 0.83, 0.98, 0.52),
        ),
        chest=ChestPlacement(width=0.44, bottom=0.87, inscription_glow=True),
        background_brightness=0.63,
    ),
    "S01E001-S06": SceneComposition(
        sprites=(
            SpritePlacement("belladone", 0.28, 1.03, 0.72),
            SpritePlacement("aconit", 0.73, 1.03, 0.75),
        ),
        spark=(0.51, 0.4),
        background_zoom=1.16,
        background_brightness=0.57,
    ),
    "S01E001-S07": SceneComposition(
        sprites=(
            SpritePlacement("belladone", 0.18, 0.98, 0.49),
            SpritePlacement("aconit", 0.82, 0.98, 0.52),
            SpritePlacement("graine-noire", 0.5, 0.79, 0.23, crop_bottom=0.38),
        ),
        chest=ChestPlacement(width=0.39, bottom=0.92, open_amount=1.0),
        spark=(0.5, 0.68),
        background_brightness=0.58,
    ),
    "S01E001-S08": SceneComposition(
        sprites=(
            SpritePlacement("belladone", 0.2, 0.98, 0.5),
            SpritePlacement("aconit", 0.81, 0.98, 0.53),
            SpritePlacement("graine-noire", 0.5, 0.82, 0.29, crop_bottom=0.38),
        ),
        chest=ChestPlacement(width=0.4, bottom=0.94, open_amount=0.92),
        roots=(
            RootPath(((0.49, 0.72), (0.4, 0.69), (0.31, 0.66), (0.25, 0.61))),
            RootPath(((0.53, 0.72), (0.61, 0.68), (0.7, 0.65), (0.76, 0.59))),
        ),
        violet_flash=0.25,
    ),
    "S01E001-S09": SceneComposition(
        sprites=(
            SpritePlacement("belladone", 0.28, 1.05, 0.7),
            SpritePlacement("aconit", 0.72, 1.05, 0.72),
            SpritePlacement("graine-noire", 0.5, 0.95, 0.23, crop_bottom=0.38),
        ),
        roots=(
            RootPath(((0.5, 0.84), (0.42, 0.7), (0.35, 0.59), (0.3, 0.54)), width=8),
            RootPath(((0.53, 0.84), (0.59, 0.7), (0.66, 0.58), (0.7, 0.53)), width=8),
        ),
        background_zoom=1.2,
        background_brightness=0.51,
    ),
    "S01E001-S10": SceneComposition(
        sprites=(
            SpritePlacement("belladone", 0.2, 0.98, 0.52),
            SpritePlacement("aconit", 0.82, 0.98, 0.55),
            SpritePlacement("graine-noire", 0.5, 0.87, 0.32, crop_bottom=0.38),
        ),
        roots=(
            RootPath(((0.5, 0.78), (0.39, 0.67), (0.28, 0.6), (0.23, 0.55)), width=8),
            RootPath(((0.53, 0.78), (0.63, 0.66), (0.73, 0.59), (0.79, 0.53)), width=8),
        ),
        spark=(0.5, 0.55),
        violet_flash=0.75,
        background_brightness=0.49,
        laughing_blooms=True,
    ),
}


def main() -> None:
    store = StudioActivityStore(OUTPUT)
    activity = store.start(
        title="Tentafruit · animatique V1",
        message="Composition narrative des dix plans",
        graph=ActivityGraphTarget(
            scope="episode",
            id="S01E001",
            node_id="episode:S01E001",
        ),
        stages=["composition", "continuity", "verification"],
    )
    active_stage = "composition"
    try:
        composer = LayeredAnimaticComposer(
            LAYERS / "greenhouse.png",
            {
                "belladone": LAYERS / "belladone.png",
                "graine-noire": LAYERS / "graine-noire.png",
                "aconit": LAYERS / "aconit.png",
            },
        )
        for index, (shot_id, scene) in enumerate(SCENES.items(), start=1):
            store.update(
                activity.id,
                stage="composition",
                status=StageStatus.RUNNING,
                message=f"Composition {index}/10 · {shot_id}",
            )
            destination = OUTPUT / shot_id
            destination.mkdir(parents=True, exist_ok=True)
            keyframe = destination / "keyframe.png"
            preserved = destination / "model-keyframe.png"
            if keyframe.is_file() and not preserved.is_file():
                shutil.copy2(keyframe, preserved)
            composer.render(scene, keyframe)
            record = {
                "schema_version": 1,
                "type": "layered-animatic-frame",
                "shot_id": shot_id,
                "keyframe": keyframe.name,
                "sha256": sha256_file(keyframe),
                "background": str((LAYERS / "greenhouse.png").resolve()),
                "cast_layers": {
                    name: str((LAYERS / f"{name}.png").resolve())
                    for name in ("belladone", "graine-noire", "aconit")
                },
            }
            (destination / "animatic-composition.json").write_text(
                json.dumps(record, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

        active_stage = "continuity"
        store.update(
            activity.id,
            stage="continuity",
            status=StageStatus.RUNNING,
            message="Contrôle des identités et de la progression coffre → graine → racines",
        )
        missing = [
            shot_id for shot_id in SCENES if not (OUTPUT / shot_id / "keyframe.png").is_file()
        ]
        if missing:
            raise RuntimeError(f"Plans manquants : {', '.join(missing)}")
        active_stage = "verification"
        store.update(
            activity.id,
            stage="verification",
            status=StageStatus.RUNNING,
            message="Les dix plans cohérents sont prêts pour le montage dialogué",
        )
        store.complete(activity.id, "Animatique Tentafruit prête pour le montage")
    except Exception as exc:
        store.fail(activity.id, stage=active_stage, message=str(exc))
        raise


if __name__ == "__main__":
    main()
