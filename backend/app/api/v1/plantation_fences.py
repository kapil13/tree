"""Plantation fence CRUD + polygon NDVI from Copernicus Sentinel-2."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import func, select

from app.api.v1.deps import DB, CurrentUser
from app.core.logging import get_logger
from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.schemas.common import Page
from app.schemas.plantation_fence import (
    GeoJsonPolygon,
    PlantationFenceCreate,
    PlantationFenceListItem,
    PlantationFenceOut,
    PlantationFenceUpdate,
    PlantationNDVIPoint,
    PlantationSatelliteRecordOut,
    PlantationSatelliteSeries,
)
from app.services.geo import geojson_polygon_to_wkt, geography_to_geojson_polygon, polygon_coordinates
from app.services.satellite.plantation import (
    ndvi_image_for_polygon,
    scan_plantation_polygon,
    series_plantation_polygon,
)

router = APIRouter(prefix="/plantation-fences", tags=["plantation-fences"])
log = get_logger(__name__)

# Click-drawn fences above this are usually a zoom mistake; block save with a clear error.
MAX_FENCE_AREA_HA = 5000.0
WARN_FENCE_AREA_HA = 500.0


def _can_access_fence(user, fence: PlantationFence) -> bool:
    if user.role == "admin":
        return True
    if fence.owner_user_id == user.id:
        return True
    return bool(user.organization_id and fence.organization_id == user.organization_id)


async def _load_fence(fence_id: uuid.UUID, user, db) -> PlantationFence:
    res = await db.execute(select(PlantationFence).where(PlantationFence.id == fence_id))
    fence = res.scalar_one_or_none()
    if fence is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="fence_not_found")
    if not _can_access_fence(user, fence):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    return fence


async def _latest_ndvi(db, fence_id: uuid.UUID) -> float | None:
    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id == fence_id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
        .limit(1)
    )
    rec = res.scalar_one_or_none()
    return float(rec.ndvi_mean) if rec and rec.ndvi_mean is not None else None


def _to_out(fence: PlantationFence, *, latest_ndvi: float | None = None) -> PlantationFenceOut:
    boundary = GeoJsonPolygon.model_validate(geography_to_geojson_polygon(fence.boundary))
    return PlantationFenceOut(
        id=fence.id,
        name=fence.name,
        organization_id=fence.organization_id,
        owner_user_id=fence.owner_user_id,
        boundary=boundary,
        area_ha=float(fence.area_ha) if fence.area_ha is not None else None,
        last_satellite_at=fence.last_satellite_at,
        created_at=fence.created_at,
        updated_at=fence.updated_at,
        ndvi_image_url=f"/api/v1/plantation-fences/{fence.id}/ndvi-image",
        latest_ndvi_mean=latest_ndvi,
    )


@router.get("", response_model=Page[PlantationFenceListItem])
async def list_fences(
    user: CurrentUser, db: DB, page: int = 1, page_size: int = 50
) -> Page[PlantationFenceListItem]:
    stmt = select(PlantationFence)
    if user.role != "admin":
        if user.organization_id:
            stmt = stmt.where(
                (PlantationFence.owner_user_id == user.id)
                | (PlantationFence.organization_id == user.organization_id)
            )
        else:
            stmt = stmt.where(PlantationFence.owner_user_id == user.id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()
    res = await db.execute(
        stmt.order_by(PlantationFence.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    fences = list(res.scalars().all())
    items: list[PlantationFenceListItem] = []
    for fence in fences:
        latest = await _latest_ndvi(db, fence.id)
        items.append(
            PlantationFenceListItem(
                id=fence.id,
                name=fence.name,
                area_ha=float(fence.area_ha) if fence.area_ha is not None else None,
                last_satellite_at=fence.last_satellite_at,
                latest_ndvi_mean=latest,
                boundary=GeoJsonPolygon.model_validate(
                    geography_to_geojson_polygon(fence.boundary)
                ),
            )
        )
    return Page(items=items, page=page, page_size=page_size, total=total)


@router.post("", response_model=PlantationFenceOut, status_code=status.HTTP_201_CREATED)
async def create_fence(
    payload: PlantationFenceCreate, user: CurrentUser, db: DB
) -> PlantationFenceOut:
    wkt = geojson_polygon_to_wkt(payload.boundary.model_dump())
    fence = PlantationFence(
        name=payload.name,
        owner_user_id=user.id,
        organization_id=user.organization_id,
        boundary=wkt,
    )
    db.add(fence)
    await db.flush()

    area_res = await db.execute(
        select(func.ST_Area(func.ST_GeogFromText(wkt)) / 10000.0)
    )
    area_ha = round(float(area_res.scalar_one()), 4)
    if area_ha > MAX_FENCE_AREA_HA:
        await db.rollback()
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=(
                f"fence_too_large:{area_ha:.1f}ha exceeds {MAX_FENCE_AREA_HA:.0f} ha. "
                "Zoom in on the map and draw a smaller block (typical plantation: 5–500 ha)."
            ),
        )
    fence.area_ha = area_ha
    await db.commit()
    await db.refresh(fence)
    return _to_out(fence)


@router.get("/{fence_id}", response_model=PlantationFenceOut)
async def get_fence(fence_id: uuid.UUID, user: CurrentUser, db: DB) -> PlantationFenceOut:
    fence = await _load_fence(fence_id, user, db)
    latest = await _latest_ndvi(db, fence.id)
    return _to_out(fence, latest_ndvi=latest)


@router.patch("/{fence_id}", response_model=PlantationFenceOut)
async def update_fence(
    fence_id: uuid.UUID, payload: PlantationFenceUpdate, user: CurrentUser, db: DB
) -> PlantationFenceOut:
    fence = await _load_fence(fence_id, user, db)
    if payload.name is not None:
        fence.name = payload.name
    await db.commit()
    await db.refresh(fence)
    latest = await _latest_ndvi(db, fence.id)
    return _to_out(fence, latest_ndvi=latest)


@router.delete("/{fence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fence(fence_id: uuid.UUID, user: CurrentUser, db: DB) -> Response:
    fence = await _load_fence(fence_id, user, db)
    await db.delete(fence)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{fence_id}/scan", response_model=PlantationSatelliteRecordOut)
async def scan_fence(fence_id: uuid.UUID, user: CurrentUser, db: DB) -> PlantationSatelliteRecordOut:
    fence = await _load_fence(fence_id, user, db)
    boundary = geography_to_geojson_polygon(fence.boundary)
    try:
        result = await scan_plantation_polygon(boundary, require_sentinel=True)
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    sample = result.sample
    rec = PlantationSatelliteRecord(
        fence_id=fence.id,
        provider=sample.provider,
        scene_id=sample.scene_id,
        scene_acquired_at=sample.scene_acquired_at,
        cloud_cover_pct=sample.cloud_cover_pct,
        ndvi_mean=sample.ndvi_mean,
        ndvi_max=sample.ndvi_max,
        ndvi_min=sample.ndvi_min,
        evi_mean=sample.evi_mean,
        presence_confirmed=sample.presence_confirmed,
        change_vs_baseline=sample.change_vs_baseline,
    )
    db.add(rec)
    fence.last_satellite_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(rec)
    return PlantationSatelliteRecordOut.model_validate(rec)


@router.get("/{fence_id}/satellite-monitoring", response_model=PlantationSatelliteSeries)
async def fence_satellite_series(
    fence_id: uuid.UUID, user: CurrentUser, db: DB, months: int = 12
) -> PlantationSatelliteSeries:
    fence = await _load_fence(fence_id, user, db)
    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id == fence.id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
        .limit(50)
    )
    stored = list(res.scalars().all())

    if not stored:
        boundary = geography_to_geojson_polygon(fence.boundary)
        try:
            samples = await series_plantation_polygon(boundary, months=months)
        except RuntimeError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
        for s in samples:
            rec = PlantationSatelliteRecord(
                fence_id=fence.id,
                provider=s.provider,
                scene_id=s.scene_id,
                scene_acquired_at=s.scene_acquired_at,
                cloud_cover_pct=s.cloud_cover_pct,
                ndvi_mean=s.ndvi_mean,
                ndvi_max=s.ndvi_max,
                ndvi_min=s.ndvi_min,
                evi_mean=s.evi_mean,
                presence_confirmed=s.presence_confirmed,
                change_vs_baseline=s.change_vs_baseline,
            )
            db.add(rec)
            stored.append(rec)
        if samples:
            fence.last_satellite_at = samples[-1].scene_acquired_at
        await db.commit()
        for r in stored:
            await db.refresh(r)

    points = [
        PlantationNDVIPoint(
            ts=r.scene_acquired_at, ndvi=float(r.ndvi_mean or 0), provider=r.provider
        )
        for r in sorted(stored, key=lambda x: x.scene_acquired_at)
    ]
    latest = max(stored, key=lambda x: x.scene_acquired_at) if stored else None
    return PlantationSatelliteSeries(
        fence_id=fence.id,
        points=points,
        latest=PlantationSatelliteRecordOut.model_validate(latest) if latest else None,
        ndvi_image_url=f"/api/v1/plantation-fences/{fence.id}/ndvi-image",
    )


@router.get("/{fence_id}/ndvi-image")
async def fence_ndvi_image(fence_id: uuid.UUID, user: CurrentUser, db: DB) -> Response:
    """False-color NDVI for the fenced plantation area (Copernicus Sentinel-2)."""
    fence = await _load_fence(fence_id, user, db)
    boundary = geography_to_geojson_polygon(fence.boundary)
    latest = await _latest_ndvi(db, fence.id)

    if latest is not None:
        ndvi = latest
        label = f"NDVI {ndvi:.2f} · sentinel-2"
    else:
        result = await scan_plantation_polygon(boundary, require_sentinel=False)
        ndvi = result.sample.ndvi_mean
        label = f"NDVI {ndvi:.2f} · {result.provider}"

    try:
        png = await ndvi_image_for_polygon(boundary, ndvi, label)
    except Exception as exc:
        from app.services.satellite.ndvi_image import render_ndvi_png_polygon

        coords = polygon_coordinates(boundary)
        png = render_ndvi_png_polygon(coords, ndvi, label=label)
        log.warning("ndvi_image_fallback", error=str(exc))

    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": "private, max-age=3600"},
    )
