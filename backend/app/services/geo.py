"""GeoJSON ↔ PostGIS helpers for plantation fences and work areas."""

from __future__ import annotations

import math
from typing import Any

from geoalchemy2.shape import to_shape
from shapely.geometry import LineString, Point, Polygon, mapping, shape
from shapely.ops import transform


def geojson_point_to_wkt(geojson: dict[str, Any]) -> str:
    geom = shape(geojson)
    if geom.geom_type != "Point":
        raise ValueError("expected Point geometry")
    return geom.wkt


def geojson_geometry_to_wkt(geojson: dict[str, Any]) -> str:
    geom = shape(geojson)
    if geom.geom_type not in {"Point", "Polygon"}:
        raise ValueError("expected Point or Polygon geometry")
    if geom.is_empty or not geom.is_valid:
        raise ValueError("invalid geometry")
    return geom.wkt


def geography_to_geojson_geometry(boundary: Any) -> dict[str, Any]:
    geom = to_shape(boundary)
    if geom.geom_type == "MultiPolygon":
        geom = max(geom.geoms, key=lambda g: g.area)
    if geom.geom_type not in {"Point", "Polygon"}:
        raise ValueError("stored geometry is not a point or polygon")
    return mapping(geom)


def point_lat_lon(geojson: dict[str, Any]) -> tuple[float, float]:
    """Return (lat, lon) from GeoJSON Point."""
    geom: Point = shape(geojson)  # type: ignore[assignment]
    return geom.y, geom.x


def geojson_polygon_to_wkt(geojson: dict[str, Any]) -> str:
    geom = shape(geojson)
    if geom.geom_type != "Polygon":
        raise ValueError("expected Polygon geometry")
    if geom.is_empty or not geom.is_valid:
        raise ValueError("invalid polygon geometry")
    return geom.wkt


def geojson_linestring_to_wkt(geojson: dict[str, Any]) -> str:
    geom = shape(geojson)
    if geom.geom_type != "LineString":
        raise ValueError("expected LineString geometry")
    if geom.is_empty or not geom.is_valid:
        raise ValueError("invalid line geometry")
    return geom.wkt


def corridor_polygon_from_line(
    line_geojson: dict[str, Any],
    buffer_m: float,
) -> dict[str, Any]:
    """Buffer a WGS84 LineString in metres and return a GeoJSON Polygon."""
    if buffer_m <= 0:
        raise ValueError("buffer_m must be positive")
    line = shape(line_geojson)
    if line.geom_type != "LineString":
        raise ValueError("expected LineString geometry")
    if line.is_empty or len(line.coords) < 2:
        raise ValueError("line needs at least two points")

    lat = line.centroid.y
    metres_per_deg_lat = 111_320.0
    metres_per_deg_lon = max(111_320.0 * math.cos(math.radians(lat)), 1e-6)

    def to_metres(x: float, y: float, z: float | None = None) -> tuple[float, float]:
        return x * metres_per_deg_lon, y * metres_per_deg_lat

    def to_degrees(x: float, y: float, z: float | None = None) -> tuple[float, float]:
        return x / metres_per_deg_lon, y / metres_per_deg_lat

    line_m = transform(to_metres, line)
    poly_m = line_m.buffer(buffer_m, cap_style=2, join_style=2)
    poly_deg = transform(to_degrees, poly_m)
    if poly_deg.geom_type == "MultiPolygon":
        poly_deg = max(poly_deg.geoms, key=lambda g: g.area)
    if poly_deg.geom_type != "Polygon":
        raise ValueError("buffer did not produce a polygon")
    return mapping(poly_deg)


def geography_to_geojson_polygon(boundary: Any) -> dict[str, Any]:
    geom = to_shape(boundary)
    if geom.geom_type == "MultiPolygon":
        geom = max(geom.geoms, key=lambda g: g.area)
    if geom.geom_type != "Polygon":
        raise ValueError("stored geometry is not a polygon")
    return mapping(geom)


def polygon_centroid(geojson: dict[str, Any]) -> tuple[float, float]:
    """Return (lat, lon) centroid."""
    geom: Polygon = shape(geojson)  # type: ignore[assignment]
    c = geom.centroid
    return c.y, c.x


def buffer_polygon_km(geojson: dict[str, Any], buffer_km: float) -> dict[str, Any]:
    """Buffer a WGS84 polygon outward by ``buffer_km`` and return GeoJSON Polygon."""
    if buffer_km <= 0:
        raise ValueError("buffer_km must be positive")
    poly: Polygon = shape(geojson)  # type: ignore[assignment]
    if poly.geom_type != "Polygon":
        raise ValueError("expected Polygon geometry")
    if poly.is_empty or not poly.is_valid:
        raise ValueError("invalid polygon geometry")

    lat = poly.centroid.y
    metres_per_deg_lat = 111_320.0
    metres_per_deg_lon = max(111_320.0 * math.cos(math.radians(lat)), 1e-6)

    def to_metres(x: float, y: float, z: float | None = None) -> tuple[float, float]:
        return x * metres_per_deg_lon, y * metres_per_deg_lat

    def to_degrees(x: float, y: float, z: float | None = None) -> tuple[float, float]:
        return x / metres_per_deg_lon, y / metres_per_deg_lat

    poly_m = transform(to_metres, poly)
    buffered_m = poly_m.buffer(buffer_km * 1000.0, join_style=2)
    buffered_deg = transform(to_degrees, buffered_m)
    if buffered_deg.geom_type == "MultiPolygon":
        buffered_deg = max(buffered_deg.geoms, key=lambda g: g.area)
    if buffered_deg.geom_type != "Polygon":
        raise ValueError("buffer did not produce a polygon")
    return mapping(buffered_deg)


def polygon_coordinates(geojson: dict[str, Any]) -> list[list[float]]:
    """Outer ring as [[lng, lat], ...] (closed)."""
    geom: Polygon = shape(geojson)  # type: ignore[assignment]
    return [list(pt) for pt in geom.exterior.coords]


def _line_metre_scales(line: LineString) -> tuple[Any, Any, float, float]:
    lat = line.centroid.y
    lat_scale = 111_320.0
    lon_scale = max(111_320.0 * math.cos(math.radians(lat)), 1e-6)

    def to_metres(x: float, y: float, z: float | None = None) -> tuple[float, float]:
        return x * lon_scale, y * lat_scale

    def to_degrees(x: float, y: float, z: float | None = None) -> tuple[float, float]:
        return x / lon_scale, y / lat_scale

    return to_metres, to_degrees, lat_scale, lon_scale


def chainage_km_along_line(
    line_geojson: dict[str, Any],
    lat: float,
    lon: float,
) -> float | None:
    """Project a point onto a line and return chainage in km from the start."""
    line: LineString = shape(line_geojson)  # type: ignore[assignment]
    if line.geom_type != "LineString" or line.is_empty:
        return None
    to_metres, _, _, _ = _line_metre_scales(line)
    line_m = transform(to_metres, line)
    pt_m = transform(to_metres, shape({"type": "Point", "coordinates": [lon, lat]}))
    dist_m = line_m.project(pt_m)
    return round(dist_m / 1000.0, 3)


def point_at_chainage_km(
    line_geojson: dict[str, Any],
    chainage_km: float,
) -> tuple[float, float] | None:
    """Return ``(lat, lon)`` at ``chainage_km`` from the start of a WGS84 line."""
    line: LineString = shape(line_geojson)  # type: ignore[assignment]
    if line.geom_type != "LineString" or line.is_empty:
        return None
    to_metres, to_degrees, _, _ = _line_metre_scales(line)
    line_m = transform(to_metres, line)
    dist_m = max(0.0, float(chainage_km) * 1000.0)
    pt_m = line_m.interpolate(dist_m)
    pt_deg = transform(to_degrees, pt_m)
    return round(pt_deg.y, 6), round(pt_deg.x, 6)
