"""Automated satellite scans for work areas and trees."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from geoalchemy2.shape import to_shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.satellite import SatelliteRecord
from app.models.tree import Tree
from app.models.user import User
from app.services.geo import geography_to_geojson_polygon
from app.services.monitoring.ndvi_change_alerts import (
    NDVI_DEGRADATION_THRESHOLD,
    emit_ndvi_change_alerts,
)
from app.services.monitoring.watch_scope import fetch_satellite_watch_fences
from app.services.satellite.plantation import scan_plantation_polygon

log = get_logger("monitoring.satellite")

MIN_BASELINE_SAMPLES = 2


async def _baseline_ndvi_change(
    db: AsyncSession, fence_id: uuid.UUID, current_ndvi: float
) -> float:
    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id == fence_id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
        .limit(6)
    )
    rows = list(res.scalars().all())
    if len(rows) < MIN_BASELINE_SAMPLES:
        return 0.0
    baseline_vals = [float(r.ndvi_mean) for r in rows[1:] if r.ndvi_mean is not None]
    if not baseline_vals:
        return 0.0
    baseline = sum(baseline_vals) / len(baseline_vals)
    return round(current_ndvi - baseline, 4)


async def _tree_baseline_ndvi_change(
    db: AsyncSession, tree_id: uuid.UUID, current_ndvi: float
) -> float:
    res = await db.execute(
        select(SatelliteRecord)
        .where(SatelliteRecord.tree_id == tree_id)
        .order_by(SatelliteRecord.scene_acquired_at.desc())
        .limit(6)
    )
    rows = list(res.scalars().all())
    if len(rows) < MIN_BASELINE_SAMPLES:
        return 0.0
    baseline_vals = [float(r.ndvi_mean) for r in rows[1:] if r.ndvi_mean is not None]
    if not baseline_vals:
        return 0.0
    baseline = sum(baseline_vals) / len(baseline_vals)
    return round(current_ndvi - baseline, 4)


async def _recent_ndvi_values_for_tree(db: AsyncSession, tree_id) -> list[float]:
    res = await db.execute(
        select(SatelliteRecord)
        .where(SatelliteRecord.tree_id == tree_id, SatelliteRecord.ndvi_mean.isnot(None))
        .order_by(SatelliteRecord.scene_acquired_at.desc())
        .limit(6)
    )
    return [float(r.ndvi_mean) for r in res.scalars().all() if r.ndvi_mean is not None]


async def _recent_ndvi_values_for_fence(db: AsyncSession, fence_id) -> list[float]:
    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(
            PlantationSatelliteRecord.fence_id == fence_id,
            PlantationSatelliteRecord.ndvi_mean.isnot(None),
        )
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
        .limit(6)
    )
    return [float(r.ndvi_mean) for r in res.scalars().all() if r.ndvi_mean is not None]


async def maybe_alert_tree_ndvi_decline(
    db: AsyncSession,
    *,
    tree: Tree,
    user: User | None,
    sample,
    change: float,
) -> None:
    notify_user = user
    if notify_user is None and tree.owner_user_id:
        notify_user = await db.get(User, tree.owner_user_id)
    if notify_user is None or sample.ndvi_mean is None:
        return
    recent = await _recent_ndvi_values_for_tree(db, tree.id)
    await emit_ndvi_change_alerts(
        db,
        user=notify_user,
        change=float(change),
        current_ndvi=float(sample.ndvi_mean),
        recent_ndvi_values=recent,
        title_prefix=tree.public_code,
        payload_base={
            "tree_id": str(tree.id),
            "project_id": str(tree.project_id) if tree.project_id else None,
        },
        dedupe_keys=("tree_id",),
    )


async def scan_and_persist_work_area(
    db: AsyncSession,
    fence: PlantationFence,
    *,
    require_sentinel: bool = False,
    run_health_analysis: bool = True,
    notify_user_id: uuid.UUID | None = None,
) -> PlantationSatelliteRecord | None:
    boundary = geography_to_geojson_polygon(fence.boundary)
    try:
        result = await scan_plantation_polygon(boundary, require_sentinel=require_sentinel)
    except Exception as exc:
        log.warning("work_area_scan_failed", fence_id=str(fence.id), error=str(exc))
        return None

    sample = result.sample
    change = sample.change_vs_baseline
    if sample.ndvi_mean is not None:
        computed = await _baseline_ndvi_change(db, fence.id, float(sample.ndvi_mean))
        if computed != 0.0:
            change = computed

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
        change_vs_baseline=change,
        indices=sample.indices,
    )
    db.add(rec)
    fence.last_satellite_at = datetime.now(UTC)
    meta = dict(fence.metadata_ or {})
    if sample.indices and not meta.get("baseline_indices"):
        meta["baseline_indices"] = sample.indices
        fence.metadata_ = meta
    await db.flush()

    if change is not None and sample.ndvi_mean is not None:
        owner_id = notify_user_id or fence.owner_user_id
        owner = await db.get(User, owner_id) if owner_id else None
        if owner:
            recent = await _recent_ndvi_values_for_fence(db, fence.id)
            await emit_ndvi_change_alerts(
                db,
                user=owner,
                change=float(change),
                current_ndvi=float(sample.ndvi_mean),
                recent_ndvi_values=recent,
                title_prefix=fence.name,
                payload_base={
                    "fence_id": str(fence.id),
                    "project_id": str(fence.project_id) if fence.project_id else None,
                },
                dedupe_keys=("fence_id",),
            )

    if run_health_analysis:
        try:
            from app.services.ai.satellite_health_ops import analyze_fence_satellite_health

            area = float(fence.area_ha) if fence.area_ha is not None else None
            await analyze_fence_satellite_health(
                db, fence.id, notify_user_id or fence.owner_user_id, area_ha=area
            )
        except Exception as exc:
            log.warning("fence_health_analysis_skipped", fence_id=str(fence.id), error=str(exc))

    return rec


async def scan_and_persist_tree(
    db: AsyncSession,
    tree: Tree,
    *,
    notify_user: User | None = None,
) -> SatelliteRecord | None:
    try:
        pt = to_shape(tree.location)
        lat, lon = pt.y, pt.x
    except Exception:
        return None

    from app.services.satellite.service import get_satellite_service

    sample = await get_satellite_service().sample(lat, lon)
    change = sample.change_vs_baseline
    if sample.ndvi_mean is not None:
        computed = await _tree_baseline_ndvi_change(db, tree.id, float(sample.ndvi_mean))
        if computed != 0.0:
            change = computed

    rec = SatelliteRecord(
        tree_id=tree.id,
        provider=sample.provider,
        scene_id=sample.scene_id,
        scene_acquired_at=sample.scene_acquired_at,
        cloud_cover_pct=sample.cloud_cover_pct,
        ndvi_mean=sample.ndvi_mean,
        ndvi_max=sample.ndvi_max,
        ndvi_min=sample.ndvi_min,
        evi_mean=sample.evi_mean,
        presence_confirmed=sample.presence_confirmed,
        change_vs_baseline=change,
    )
    db.add(rec)
    tree.last_satellite_at = datetime.now(UTC)
    tree.satellite_verified = bool(sample.presence_confirmed)
    await db.flush()

    from app.services.integrity.refresh import refresh_tree_integrity

    await refresh_tree_integrity(db, tree)

    await maybe_alert_tree_ndvi_decline(
        db,
        tree=tree,
        user=notify_user,
        sample=sample,
        change=float(change or 0.0),
    )
    return rec


async def run_monthly_satellite_sweep(db: AsyncSession) -> dict[str, Any]:
    """Scan work areas on satellite-watch-enabled projects only."""
    scanned = 0
    failed = 0
    skipped = 0

    fences = await fetch_satellite_watch_fences(db)

    for fence in fences:
        if fence.last_satellite_at:
            age_days = (datetime.now(UTC) - fence.last_satellite_at).days
            if age_days < 25:
                skipped += 1
                continue
        rec = await scan_and_persist_work_area(db, fence, require_sentinel=False)
        if rec:
            scanned += 1
        else:
            failed += 1

    await db.commit()
    result = {
        "scanned": scanned,
        "failed": failed,
        "skipped": skipped,
        "total": len(fences),
        "watch_gated": True,
    }
    log.info("monthly_satellite_sweep.complete", **result)
    return result


async def run_project_satellite_scan(db: AsyncSession, project_id: uuid.UUID) -> dict[str, Any]:
    scanned = 0
    failed = 0
    res = await db.execute(
        select(PlantationFence).where(PlantationFence.project_id == project_id)
    )
    for fence in res.scalars().all():
        rec = await scan_and_persist_work_area(db, fence, require_sentinel=False)
        if rec:
            scanned += 1
        else:
            failed += 1
    await db.commit()
    return {"scanned": scanned, "failed": failed}
