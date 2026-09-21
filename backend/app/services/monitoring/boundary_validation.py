"""Geospatial boundary validation for monitoring sweeps."""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.services.geo import geography_to_geojson_polygon

log = get_logger("monitoring.boundary")


def try_fence_boundary_geojson(fence: Any) -> dict[str, Any] | None:
    """Return GeoJSON polygon for a fence boundary, or None when invalid."""
    try:
        return geography_to_geojson_polygon(fence.boundary)
    except Exception as exc:
        log.warning(
            "fence_boundary_invalid",
            fence_id=str(getattr(fence, "id", "")),
            work_area_name=getattr(fence, "name", None),
            error=str(exc),
        )
        return None
