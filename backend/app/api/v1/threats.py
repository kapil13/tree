"""Hazard threat map endpoints (FIRMS fire overlay, etc.)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query

from app.api.v1.deps import DB, CurrentUser, require_satellite_feature
from app.api.v1.plantation_fences import _load_fence
from app.core.config import settings
from app.schemas.threats import FenceFiresOut, FireDetectionOut
from app.services.geo import geography_to_geojson_polygon, polygon_centroid
from app.services.threats.fire_watch import assess_fire_proximity
from app.services.threats.firms_client import fetch_fires_near_point, has_firms_credentials

router = APIRouter(prefix="/threats", tags=["threats"])


@router.get("/fires", response_model=FenceFiresOut)
async def get_fires_near_fence(
    user: CurrentUser,
    db: DB,
    fence_id: uuid.UUID = Query(..., description="Plantation fence / work area id"),
    days: int = Query(1, ge=1, le=10),
    _satellite: None = Depends(require_satellite_feature),
) -> FenceFiresOut:
    """Return NASA FIRMS active fire detections near a work-area centroid."""
    fence = await _load_fence(fence_id, user, db)
    boundary = geography_to_geojson_polygon(fence.boundary)
    lat, lon = polygon_centroid(boundary)
    radius = settings.hazard_fire_radius_km
    fires = await fetch_fires_near_point(lat, lon, radius_km=radius, days=days)
    assessment = await assess_fire_proximity(
        lat,
        lon,
        radius_km=radius,
        days=days,
        fires=fires,
    )
    return FenceFiresOut(
        fence_id=fence.id,
        fence_name=fence.name,
        centroid_lat=round(lat, 5),
        centroid_lon=round(lon, 5),
        radius_km=radius,
        days=days,
        firms_configured=has_firms_credentials(),
        fire_count=assessment["fire_count"],
        nearest_km=assessment.get("nearest_km"),
        risk_level=assessment["risk_level"],
        detections=[FireDetectionOut(**f.as_dict()) for f in fires],
    )
