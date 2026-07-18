"""Build work area geometry from API payloads."""

from __future__ import annotations

from typing import Any

from app.schemas.planting_project import WorkAreaCreate
from app.services.geo import corridor_polygon_from_line, geojson_polygon_to_wkt


def resolve_work_area_geometry(payload: WorkAreaCreate) -> tuple[str, dict[str, Any]]:
    """Return (polygon_wkt, metadata_updates)."""
    meta: dict[str, Any] = {}

    if payload.geometry_type == "polygon":
        if payload.boundary is None:
            raise ValueError("boundary_required_for_polygon")
        wkt = geojson_polygon_to_wkt(payload.boundary.model_dump())
        return wkt, meta

    if payload.centerline is None:
        raise ValueError("centerline_required_for_corridor")
    if payload.buffer_m is None:
        raise ValueError("buffer_m_required_for_corridor")

    centerline = payload.centerline.model_dump()
    polygon = corridor_polygon_from_line(centerline, float(payload.buffer_m))
    meta["source_geometry"] = centerline
    wkt = geojson_polygon_to_wkt(polygon)
    return wkt, meta
