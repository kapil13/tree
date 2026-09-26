"""Approximate Sentinel-2 scan tile bucketing for per-tree sweep grouping.

Full MGRS encoding is deferred; we use a ~1 km lat/lon grid suitable for
grouping trees that share the same Sentinel-2 overpass neighbourhood.
"""

from __future__ import annotations

import math


def tree_to_scan_tile(lat: float, lon: float) -> str:
    """Return a stable tile id for scan batching (~0.01° grid)."""
    lat_band = int(round(lat * 100))
    lon_band = int(round(lon * 100))
    return f"S2TILE_{lat_band}_{lon_band}"


def tile_centroid(tile_id: str) -> tuple[float, float] | None:
    if not tile_id.startswith("S2TILE_"):
        return None
    parts = tile_id.split("_")
    if len(parts) != 3:
        return None
    try:
        lat = int(parts[1]) / 100.0
        lon = int(parts[2]) / 100.0
    except ValueError:
        return None
    return lat, lon


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))
