"""Generate 研程 app icons without external assets.

The mark is an eight-node research path: seven ink nodes and one gold
endpoint, ascending left to right. It echoes the eight project stages.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "icons"

INK_TOP = (27, 54, 40)
INK_BOTTOM = (8, 19, 13)
CREAM = (237, 234, 223, 238)
GOLD = (213, 166, 86, 255)

# Eight points on a 0..100 canvas. The path rises overall, with two
# small setbacks, like a research project rather than a straight line.
POINTS = [
    (13, 79),
    (25, 63),
    (37, 70),
    (49, 51),
    (60, 57),
    (71, 36),
    (81, 43),
    (90, 20),
]


def gradient(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), INK_BOTTOM + (255,))
    pixels = image.load()
    for y in range(size):
        t = y / max(1, size - 1)
        color = tuple(round(INK_TOP[i] * (1 - t) + INK_BOTTOM[i] * t) for i in range(3))
        for x in range(size):
            pixels[x, y] = color + (255,)
    return image


def add_glow(image: Image.Image) -> Image.Image:
    size = image.width
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    cx, cy, r = int(size * 0.12), int(size * 0.04), int(size * 0.46)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(213, 166, 86, 46))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.12))
    return Image.alpha_composite(image, glow)


def draw_mark(image: Image.Image, scale: float) -> Image.Image:
    size = image.width
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    margin = size * 0.18
    span = size - margin * 2
    pts = [(margin + x / 100 * span, margin + y / 100 * span) for x, y in POINTS]
    line_width = max(2, round(size * 0.022 * scale))
    node_radius = max(2.2, size * 0.016 * scale)
    draw.line(pts, fill=CREAM, width=line_width, joint="curve")
    for index, (x, y) in enumerate(pts[:-1]):
        r = node_radius if index < len(pts) - 2 else node_radius * 1.08
        draw.ellipse((x - r, y - r, x + r, y + r), fill=CREAM)
    x, y = pts[-1]
    r = node_radius * 1.5
    draw.ellipse((x - r, y - r, x + r, y + r), fill=GOLD)
    return Image.alpha_composite(image, layer)


def rounded_mask(size: int, radius_ratio: float) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    radius = round(size * radius_ratio)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def build_icon(size: int, destination: Path, maskable: bool = False) -> None:
    supersample = 4
    canvas = gradient(size * supersample)
    canvas = add_glow(canvas)
    canvas = draw_mark(canvas, scale=0.84 if maskable else 1.0)
    canvas = canvas.resize((size, size), Image.LANCZOS)
    if not maskable:
        canvas.putalpha(rounded_mask(size, 0.22))
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, "PNG", optimize=True)


def main() -> None:
    build_icon(180, ICON_DIR / "icon-180.png")
    build_icon(192, ICON_DIR / "icon-192.png")
    build_icon(512, ICON_DIR / "icon-512.png")
    build_icon(64, ICON_DIR / "icon-64.png")
    build_icon(512, ICON_DIR / "icon-maskable-512.png", maskable=True)
    print(f"Generated icons in {ICON_DIR}")


if __name__ == "__main__":
    main()
