"""Build work area geometry from API payloads."""

from __future__ import annotations

from typing import Any

from app.schemas.planting_project import WorkAreaCreate, WorkAreaUpdate
from app.services.geo import corridor_polygon_from_line, geojson_polygon_to_wkt


def resolve_work_area_geometry(payload: WorkAreaCreate) -> tuple[str, dict[str, Any]]:
    """Return (polygon_wkt, metadata_updates)."""
    return _resolve_geometry(
        geometry_type=payload.geometry_type,
        boundary=payload.boundary,
        centerline=payload.centerline,
        buffer_m=payload.buffer_m,
    )


def resolve_work_area_geometry_update(
    fence_geometry_type: str,
    payload: WorkAreaUpdate,
) -> tuple[str, dict[str, Any]] | None:
    """Return geometry update when boundary/centerline/buffer fields are sent."""
    geometry_type = payload.geometry_type or fence_geometry_type
    if payload.boundary is None and payload.centerline is None and payload.buffer_m is None:
        if payload.geometry_type is None:
            return None
        if geometry_type == "polygon" and payload.boundary is None:
            raise ValueError("boundary_required_for_polygon")
        if geometry_type == "corridor" and payload.centerline is None:
            raise ValueError("centerline_required_for_corridor")
    return _resolve_geometry(
        geometry_type=geometry_type,
        boundary=payload.boundary,
        centerline=payload.centerline,
        buffer_m=payload.buffer_m,
    )


def _resolve_geometry(
    *,
    geometry_type: str,
    boundary,
    centerline,
    buffer_m: float | None,
) -> tuple[str, dict[str, Any]]:
    meta: dict[str, Any] = {}

    if geometry_type == "polygon":
        if boundary is None:
            raise ValueError("boundary_required_for_polygon")
        wkt = geojson_polygon_to_wkt(boundary.model_dump())
        return wkt, meta

    if centerline is None:
        raise ValueError("centerline_required_for_corridor")
    if buffer_m is None:
        raise ValueError("buffer_m_required_for_corridor")

    centerline_dict = centerline.model_dump()
    polygon = corridor_polygon_from_line(centerline_dict, float(buffer_m))
    meta["source_geometry"] = centerline_dict
    wkt = geojson_polygon_to_wkt(polygon)
    return wkt, meta
