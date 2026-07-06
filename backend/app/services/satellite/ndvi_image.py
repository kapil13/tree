"""Render NDVI rasters as PNG preview chips (dev stub + real stats)."""

from __future__ import annotations

import hashlib
import io
import math
import random

import numpy as np
from PIL import Image, ImageDraw

# Sentinel-2 native resolution (B2/B3/B4/B8); preview chip extent around tree.
CHIP_RESOLUTION_M = 10
CHIP_EXTENT_M = 10


def _ndvi_rgb(value: float) -> tuple[int, int, int]:
    """Classic NDVI colormap: brown → yellow → green."""
    v = max(0.0, min(1.0, value))
    if v < 0.1:
        return (156, 120, 90)
    if v < 0.25:
        t = (v - 0.1) / 0.15
        return (int(200 + 55 * t), int(160 + 60 * t), int(80 + 20 * t))
    if v < 0.5:
        t = (v - 0.25) / 0.25
        return (int(255 - 100 * t), int(220 + 20 * t), int(100 - 40 * t))
    t = min(1.0, (v - 0.5) / 0.45)
    return (int(155 - 80 * t), int(200 + 20 * t), int(60 + 30 * t))


def _ndvi_grid(
    lat: float,
    lon: float,
    center_ndvi: float,
    size: int = 128,
    *,
    extent_m: float = CHIP_EXTENT_M,
) -> np.ndarray:
    """Synthetic NDVI patch for a {extent_m} m chip around a tree (deterministic)."""
    seed = int.from_bytes(hashlib.sha256(f"{lat:.6f}:{lon:.6f}".encode()).digest()[:4], "big")
    rng = random.Random(seed)
    grid = np.zeros((size, size), dtype=np.float32)
    cx, cy = size // 2, size // 2
    # Tighter canopy footprint on smaller (10 m) chips.
    falloff_scale = 0.55 if extent_m <= CHIP_EXTENT_M else 0.35
    for y in range(size):
        for x in range(size):
            dist = math.hypot(x - cx, y - cy) / (size * 0.45)
            noise = rng.uniform(-0.06, 0.06)
            falloff = max(0.0, 1.0 - dist * falloff_scale)
            grid[y, x] = center_ndvi * falloff + 0.15 * (1 - falloff) + noise
    return np.clip(grid, 0.0, 1.0)


def render_ndvi_png(
    lat: float,
    lon: float,
    ndvi_mean: float,
    *,
    size: int = 256,
    label: str | None = None,
    extent_m: float = CHIP_EXTENT_M,
) -> bytes:
    """PNG bytes for an NDVI false-color chip centred on the tree."""
    grid = _ndvi_grid(lat, lon, ndvi_mean, size=size, extent_m=extent_m)
    rgb = np.zeros((size, size, 3), dtype=np.uint8)
    for y in range(size):
        for x in range(size):
            rgb[y, x] = _ndvi_rgb(float(grid[y, x]))

    img = Image.fromarray(rgb, mode="RGB")
    draw = ImageDraw.Draw(img)

    # Tree location marker
    c = size // 2
    r = max(6, size // 32)
    draw.ellipse((c - r, c - r, c + r, c + r), outline=(255, 255, 255), width=3)
    draw.ellipse((c - r + 2, c - r + 2, c - r + 5, c - r + 5), fill=(255, 255, 255))

    # Legend bar
    bar_w, bar_h = size - 24, 10
    bx, by = 12, size - 22
    for i in range(bar_w):
        t = i / max(1, bar_w - 1)
        color = _ndvi_rgb(t)
        draw.line([(bx + i, by), (bx + i, by + bar_h)], fill=color, width=1)

    if label:
        draw.rectangle((8, 8, size - 8, 28), fill=(0, 0, 0, 128))
        draw.text((12, 10), label, fill=(255, 255, 255))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
