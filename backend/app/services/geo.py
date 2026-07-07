"""GeoJSON ↔ PostGIS helpers for plantation fences."""

from __future__ import annotations

from typing import Any

from geoalchemy2.shape import to_shape
from shapely.geometry import Polygon, mapping, shape


def geojson_polygon_to_wkt(geojson: dict[str, Any]) -> str:
    geom = shape(geojson)
    if geom.geom_type != "Polygon":
        raise ValueError("expected Polygon geometry")
    if geom.is_empty or not geom.is_valid:
        raise ValueError("invalid polygon geometry")
    return geom.wkt


def geography_to_geojson_polygon(boundary: Any) -> dict[str, Any]:
    geom = to_shape(boundary)
    if geom.geom_type != "Polygon":
        raise ValueError("stored geometry is not a polygon")
    return mapping(geom)


def polygon_centroid(geojson: dict[str, Any]) -> tuple[float, float]:
    """Return (lat, lon) centroid."""
    geom: Polygon = shape(geojson)  # type: ignore[assignment]
    c = geom.centroid
    return c.y, c.x


def polygon_coordinates(geojson: dict[str, Any]) -> list[list[float]]:
    """Outer ring as [[lng, lat], ...] (closed)."""
    geom: Polygon = shape(geojson)  # type: ignore[assignment]
    return [list(pt) for pt in geom.exterior.coords]
