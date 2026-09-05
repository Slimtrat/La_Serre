"""Generate production-ready La Serre icon variants from the ImageGen master."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BRAND_ROOT = PROJECT_ROOT / "assets" / "branding"
SOURCE = BRAND_ROOT / "la-serre-icon-master.png"
BACKGROUND = (9, 13, 11, 255)
CANVAS_SIZE = 1024
TILE_SIZE = 922


def main() -> int:
    if not SOURCE.is_file():
        raise FileNotFoundError(f"Missing ImageGen master: {SOURCE}")

    BRAND_ROOT.mkdir(parents=True, exist_ok=True)
    master = _normalise_source(Image.open(SOURCE))
    icon = _fit_tile(master, CANVAS_SIZE, TILE_SIZE)

    _save_png(icon, BRAND_ROOT / "la-serre-icon.png", 1024)
    _save_png(icon, BRAND_ROOT / "la-serre-icon-readme.png", 384)
    _save_png(icon, BRAND_ROOT / "la-serre-icon-taskbar.png", 256)
    _save_png(icon, BRAND_ROOT / "la-serre-icon-tray.png", 64)
    _save_png(icon, PROJECT_ROOT / "apps" / "api" / "static" / "favicon.png", 64)
    icon.save(
        BRAND_ROOT / "la-serre.ico",
        format="ICO",
        sizes=[
            (16, 16),
            (20, 20),
            (24, 24),
            (32, 32),
            (40, 40),
            (48, 48),
            (64, 64),
            (128, 128),
            (256, 256),
        ],
    )
    return 0


def _normalise_source(source: Image.Image) -> Image.Image:
    image = source.convert("RGBA")
    alpha = image.getchannel("A")
    if alpha.getextrema()[0] < 250:
        bounds = alpha.getbbox()
        if bounds is None:
            raise ValueError("The ImageGen master is fully transparent")
        return _square_crop(image.crop(bounds))

    # Some image generators render a checkerboard instead of writing alpha. Locate
    # the near-black app tile, then rebuild its rounded alpha edge deterministically.
    rgb = image.convert("RGB")
    dark_mask = Image.new("L", image.size)
    dark_mask.putdata(
        [255 if max(pixel) < 80 else 0 for pixel in rgb.get_flattened_data()]
    )
    bounds = dark_mask.getbbox()
    if bounds is None:
        raise ValueError("Could not locate the dark app tile in the ImageGen master")

    left, top, right, bottom = bounds
    inset = max(2, round(min(image.size) * 0.003))
    bounds = (
        max(0, left - inset),
        max(0, top - inset),
        min(image.width, right + inset),
        min(image.height, bottom + inset),
    )
    tile = image.crop(bounds)

    # Remove any baked neutral checkerboard pixels that fall just inside the
    # reconstructed rounded tile without disturbing the green/violet emblem.
    cleaned = tile.copy()
    pixels = cleaned.load()
    for y in range(cleaned.height):
        for x in range(cleaned.width):
            red, green, blue, _ = pixels[x, y]
            if (
                min(red, green, blue) > 150
                and max(red, green, blue) - min(red, green, blue) < 16
            ):
                pixels[x, y] = BACKGROUND

    scale = 4
    mask = Image.new("L", (cleaned.width * scale, cleaned.height * scale), 0)
    drawing = ImageDraw.Draw(mask)
    radius = round(min(cleaned.size) * 0.17 * scale)
    drawing.rounded_rectangle(
        (0, 0, mask.width - 1, mask.height - 1),
        radius=radius,
        fill=255,
    )
    mask = mask.resize(cleaned.size, Image.Resampling.LANCZOS)
    cleaned.putalpha(mask)
    return _square_crop(cleaned)


def _square_crop(image: Image.Image) -> Image.Image:
    size = max(image.size)
    square = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    square.alpha_composite(
        image,
        ((size - image.width) // 2, (size - image.height) // 2),
    )
    return square


def _fit_tile(source: Image.Image, canvas_size: int, tile_size: int) -> Image.Image:
    tile = source.resize((tile_size, tile_size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    offset = (canvas_size - tile_size) // 2
    canvas.alpha_composite(tile, (offset, offset))
    return canvas


def _save_png(source: Image.Image, destination: Path, size: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    output = source.resize((size, size), Image.Resampling.LANCZOS)
    output.save(destination, format="PNG", optimize=True)


if __name__ == "__main__":
    raise SystemExit(main())
