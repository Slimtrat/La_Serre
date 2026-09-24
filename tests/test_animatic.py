from pathlib import Path

from PIL import Image

from engine.production.animatic import (
    ChestPlacement,
    LayeredAnimaticComposer,
    RootPath,
    SceneComposition,
    SpritePlacement,
)


def test_layered_animatic_composer_renders_story_frame(tmp_path: Path) -> None:
    background = tmp_path / "background.png"
    sprite = tmp_path / "sprite.png"
    Image.new("RGB", (240, 400), (80, 100, 120)).save(background)
    Image.new("RGBA", (80, 200), (160, 40, 180, 220)).save(sprite)

    output = tmp_path / "frame.png"
    composer = LayeredAnimaticComposer(
        background,
        {"hero": sprite},
        width=288,
        height=512,
    )
    composer.render(
        SceneComposition(
            sprites=(SpritePlacement("hero", 0.35, 0.95, 0.55),),
            chest=ChestPlacement(width=0.3, bite=True, inscription_glow=True),
            roots=(RootPath(((0.4, 0.6), (0.5, 0.75))),),
            spark=(0.5, 0.5),
            laughing_blooms=True,
        ),
        output,
    )

    with Image.open(output) as rendered:
        assert rendered.size == (288, 512)
        assert rendered.mode == "RGB"


def test_layered_animatic_composer_rejects_unknown_sprite(tmp_path: Path) -> None:
    background = tmp_path / "background.png"
    Image.new("RGB", (64, 64), "black").save(background)
    composer = LayeredAnimaticComposer(background, {}, width=64, height=64)

    try:
        composer.render(
            SceneComposition(sprites=(SpritePlacement("missing", 0.5, 1.0, 0.5),)),
            tmp_path / "frame.png",
        )
    except KeyError as exc:
        assert "missing" in str(exc)
    else:
        raise AssertionError("Unknown sprite should fail")
