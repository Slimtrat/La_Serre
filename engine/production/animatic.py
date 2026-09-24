from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps


@dataclass(frozen=True, slots=True)
class SpritePlacement:
    asset: str
    x: float
    bottom: float
    height: float
    opacity: float = 1.0
    crop_bottom: float = 0.0


@dataclass(frozen=True, slots=True)
class ChestPlacement:
    x: float = 0.5
    bottom: float = 0.88
    width: float = 0.34
    open_amount: float = 0.0
    bite: bool = False
    inscription_glow: bool = False


@dataclass(frozen=True, slots=True)
class RootPath:
    points: tuple[tuple[float, float], ...]
    width: int = 7
    color: tuple[int, int, int, int] = (35, 15, 48, 255)
    glow: tuple[int, int, int, int] = (181, 63, 255, 145)


@dataclass(frozen=True, slots=True)
class SceneComposition:
    sprites: tuple[SpritePlacement, ...] = ()
    chest: ChestPlacement | None = None
    roots: tuple[RootPath, ...] = ()
    spark: tuple[float, float] | None = None
    violet_flash: float = 0.0
    background_zoom: float = 1.0
    background_brightness: float = 0.72
    laughing_blooms: bool = False


class LayeredAnimaticComposer:
    """Compose deterministic story frames from an AI background and approved cast layers."""

    def __init__(
        self,
        background: Path,
        sprites: dict[str, Path],
        *,
        width: int = 576,
        height: int = 1024,
    ) -> None:
        self.width = width
        self.height = height
        with Image.open(background) as opened:
            self.background = opened.convert("RGB")
        self.sprites: dict[str, Image.Image] = {}
        for key, path in sprites.items():
            with Image.open(path) as opened:
                self.sprites[key] = opened.convert("RGBA")

    def render(self, scene: SceneComposition, destination: Path) -> Path:
        canvas = self._background(scene.background_zoom, scene.background_brightness)
        if scene.chest is not None:
            self._draw_chest(canvas, scene.chest)
        for placement in scene.sprites:
            self._paste_sprite(canvas, placement)
        for root in scene.roots:
            self._draw_root(canvas, root)
        if scene.spark is not None:
            self._draw_spark(canvas, scene.spark)
        if scene.laughing_blooms:
            self._draw_laughing_blooms(canvas)
        if scene.violet_flash > 0:
            flash = Image.new(
                "RGBA",
                canvas.size,
                (140, 44, 221, round(90 * min(1.0, scene.violet_flash))),
            )
            canvas.alpha_composite(flash)
        self._apply_vignette(canvas)
        destination.parent.mkdir(parents=True, exist_ok=True)
        canvas.convert("RGB").save(destination, format="PNG", optimize=True)
        return destination

    def _background(self, zoom: float, brightness: float) -> Image.Image:
        fitted = ImageOps.fit(
            self.background,
            (self.width, self.height),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.55),
        )
        if zoom > 1:
            enlarged = fitted.resize(
                (round(self.width * zoom), round(self.height * zoom)),
                Image.Resampling.LANCZOS,
            )
            left = (enlarged.width - self.width) // 2
            top = (enlarged.height - self.height) // 2
            fitted = enlarged.crop((left, top, left + self.width, top + self.height))
        fitted = ImageEnhance.Brightness(fitted).enhance(brightness)
        fitted = ImageEnhance.Color(fitted).enhance(0.82)
        blue_grade = Image.new("RGB", fitted.size, (22, 12, 48))
        return Image.blend(fitted, blue_grade, 0.14).convert("RGBA")

    def _paste_sprite(self, canvas: Image.Image, placement: SpritePlacement) -> None:
        if placement.asset not in self.sprites:
            raise KeyError(f"Unknown sprite: {placement.asset}")
        sprite = self.sprites[placement.asset].copy()
        if placement.crop_bottom > 0:
            crop_height = round(sprite.height * (1 - placement.crop_bottom))
            sprite = sprite.crop((0, 0, sprite.width, max(1, crop_height)))
        target_height = max(1, round(self.height * placement.height))
        target_width = max(1, round(sprite.width * target_height / sprite.height))
        sprite = sprite.resize((target_width, target_height), Image.Resampling.LANCZOS)
        if placement.opacity < 1:
            alpha = sprite.getchannel("A").point(
                lambda value: round(value * max(0.0, placement.opacity))
            )
            sprite.putalpha(alpha)
        x = round(self.width * placement.x - sprite.width / 2)
        y = round(self.height * placement.bottom - sprite.height)
        shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(shadow)
        draw.ellipse(
            (
                x + round(sprite.width * 0.12),
                y + sprite.height - 16,
                x + round(sprite.width * 0.88),
                y + sprite.height + 12,
            ),
            fill=(0, 0, 0, 115),
        )
        canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(9)))
        canvas.alpha_composite(sprite, (x, y))

    def _draw_chest(self, canvas: Image.Image, chest: ChestPlacement) -> None:
        width = round(self.width * chest.width)
        body_height = max(52, round(width * 0.45))
        center_x = round(self.width * chest.x)
        bottom = round(self.height * chest.bottom)
        x0 = center_x - width // 2
        y0 = bottom - body_height
        x1 = x0 + width
        y1 = bottom

        shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow)
        shadow_draw.ellipse(
            (x0 - 18, y1 - 12, x1 + 18, y1 + 24),
            fill=(0, 0, 0, 155),
        )
        canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)))

        prop = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(prop)
        draw.rounded_rectangle(
            (x0, y0, x1, y1),
            radius=max(8, width // 15),
            fill=(23, 13, 29, 255),
            outline=(91, 63, 99, 255),
            width=max(2, width // 55),
        )
        for ratio in (0.14, 0.48, 0.82):
            x = round(x0 + width * ratio)
            draw.line((x, y0 + 8, x - 5, y1 - 8), fill=(57, 33, 60, 220), width=3)
        band = max(5, width // 25)
        draw.rectangle(
            (
                x0 + width // 14,
                y0 + body_height // 2,
                x1 - width // 14,
                y0 + body_height // 2 + band,
            ),
            fill=(56, 42, 60, 255),
        )

        lid_raise = round(body_height * 0.85 * chest.open_amount)
        lid_y = y0 - max(10, body_height // 5)
        lid = (
            (x0 - 4, lid_y),
            (x1 + 4, lid_y - lid_raise),
            (x1 - 2, y0 + 8 - lid_raise),
            (x0 + 2, y0 + 8),
        )
        draw.polygon(lid, fill=(31, 15, 37, 255), outline=(113, 73, 119, 255))
        draw.line((*lid[0], *lid[1]), fill=(151, 92, 158, 230), width=3)

        lock_y = y0 + round(body_height * 0.62)
        lock_width = max(24, width // 7)
        lock_height = max(18, body_height // 5)
        draw.rounded_rectangle(
            (
                center_x - lock_width,
                lock_y - lock_height,
                center_x + lock_width,
                lock_y + lock_height,
            ),
            radius=5,
            fill=(58, 63, 72, 255),
            outline=(161, 166, 179, 255),
            width=2,
        )
        mouth_open = 11 if chest.bite else 5
        draw.line(
            (center_x - lock_width + 5, lock_y, center_x + lock_width - 5, lock_y),
            fill=(8, 3, 12, 255),
            width=mouth_open,
        )
        tooth = max(3, width // 45)
        for offset in (-lock_width // 2, 0, lock_width // 2):
            draw.polygon(
                (
                    (center_x + offset - tooth, lock_y - mouth_open // 2),
                    (center_x + offset + tooth, lock_y - mouth_open // 2),
                    (center_x + offset, lock_y + tooth),
                ),
                fill=(207, 211, 205, 255),
            )
        if chest.inscription_glow:
            glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
            glow_draw = ImageDraw.Draw(glow)
            glow_draw.rounded_rectangle(
                (x0 + width // 7, y0 + 12, x1 - width // 7, y0 + body_height // 2 - 4),
                radius=8,
                fill=(177, 66, 255, 125),
            )
            canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(12)))
            draw.rounded_rectangle(
                (x0 + width // 7, y0 + 12, x1 - width // 7, y0 + body_height // 2 - 4),
                radius=8,
                outline=(218, 154, 255, 230),
                width=3,
            )
        canvas.alpha_composite(prop)

    def _draw_root(self, canvas: Image.Image, root: RootPath) -> None:
        points = [(round(x * self.width), round(y * self.height)) for x, y in root.points]
        glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow)
        glow_draw.line(points, fill=root.glow, width=root.width * 3, joint="curve")
        canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(root.width * 1.8)))
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        draw.line(points, fill=root.color, width=root.width, joint="curve")
        draw.line(points, fill=(137, 63, 172, 210), width=max(1, root.width // 3), joint="curve")
        canvas.alpha_composite(overlay)

    def _draw_spark(self, canvas: Image.Image, location: tuple[float, float]) -> None:
        x = round(location[0] * self.width)
        y = round(location[1] * self.height)
        glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(glow)
        for radius, alpha in ((44, 35), (24, 75), (10, 210)):
            draw.ellipse(
                (x - radius, y - radius, x + radius, y + radius), fill=(194, 77, 255, alpha)
            )
        draw.line(
            (x - 18, y + 10, x - 4, y - 9, x + 5, y + 3, x + 20, y - 16),
            fill=(245, 222, 255, 255),
            width=3,
        )
        canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(5)))

    def _draw_laughing_blooms(self, canvas: Image.Image) -> None:
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        locations = ((45, 655), (530, 615), (72, 820), (506, 835), (128, 900), (455, 930))
        for index, (x, y) in enumerate(locations):
            radius = 22 + (index % 2) * 5
            color = (129, 57, 162, 230) if index % 2 else (46, 86, 159, 230)
            for angle_x, angle_y in ((0, -radius), (radius, 0), (0, radius), (-radius, 0)):
                draw.ellipse(
                    (
                        x + angle_x - radius,
                        y + angle_y - radius,
                        x + angle_x + radius,
                        y + angle_y + radius,
                    ),
                    fill=color,
                )
            draw.ellipse((x - 19, y - 13, x + 19, y + 17), fill=(19, 8, 26, 245))
            draw.arc((x - 12, y - 5, x + 12, y + 11), 5, 175, fill=(241, 222, 245, 255), width=3)
        canvas.alpha_composite(overlay)

    def _apply_vignette(self, canvas: Image.Image) -> None:
        mask = Image.new("L", canvas.size, 220)
        draw = ImageDraw.Draw(mask)
        inset_x = round(self.width * 0.08)
        inset_y = round(self.height * 0.04)
        draw.ellipse(
            (inset_x, inset_y, self.width - inset_x, self.height - inset_y),
            fill=0,
        )
        mask = mask.filter(ImageFilter.GaussianBlur(round(self.width * 0.14)))
        darkness = Image.new("RGBA", canvas.size, (4, 1, 9, 0))
        darkness.putalpha(mask)
        canvas.alpha_composite(darkness)
