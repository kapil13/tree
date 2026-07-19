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
from app.models.planting_project import PlantingProject
from app.models.satellite import SatelliteRecord
from app.models.tree import Tree
from app.models.user import User
from app.services.geo import geography_to_geojson_polygon
from app.services.monitoring.alert_engine import create_monitoring_alert
from app.services.satellite.plantation import scan_plantation_polygon

log = get_logger("monitoring.satellite")

NDVI_DEGRADATION_THRESHOLD = -0.15
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
    )
    db.add(rec)
    fence.last_satellite_at = datetime.now(UTC)
    await db.flush()

    if change is not None and change <= NDVI_DEGRADATION_THRESHOLD:
        owner_id = notify_user_id or fence.owner_user_id
        owner = await db.get(User, owner_id) if owner_id else None
        if owner:
            project_id = str(fence.project_id) if fence.project_id else None
            await create_monitoring_alert(
                db,
                user=owner,
                kind="ndvi_degradation",
                severity="high",
                title=f"NDVI drop — {fence.name}",
                message=(
                    f"Vegetation index fell {abs(change):.2f} vs recent baseline "
                    f"(current NDVI {sample.ndvi_mean:.2f}). Inspect work area."
                ),
                payload={
                    "fence_id": str(fence.id),
                    "project_id": project_id,
                    "ndvi_mean": float(sample.ndvi_mean) if sample.ndvi_mean else None,
                    "change_vs_baseline": change,
                },
                prefs_key="satellite_health",
                dedupe_hours=168,
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


async def scan_and_persist_tree(db: AsyncSession, tree: Tree) -> SatelliteRecord | None:
    try:
        pt = to_shape(tree.location)
        lat, lon = pt.y, pt.x
    except Exception:
        return None

    from app.services.satellite.plantation import has_sentinel_credentials
    from app.services.satellite.service import get_satellite_service

    sample = None
    if has_sentinel_credentials():
        try:
            from app.services.satellite.sentinel_hub import SentinelHubClient
            from app.core.config import settings

            client = SentinelHubClient(
                settings.sentinel_hub_client_id or "",
                settings.sentinel_hub_client_secret or "",
                api_base_url=settings.sentinel_hub_api_url,
                token_url=settings.sentinel_hub_token_url,
            )
            latest = await client.fetch_latest_sample(lat, lon)
            if latest:
                ts, stats = latest
                from app.services.satellite.plantation import _sample_from_stats

                sample = _sample_from_stats(lat, lon, ts, stats)
        except Exception as exc:
            log.warning("tree_sentinel_scan_failed", tree_id=str(tree.id), error=str(exc))

    if sample is None:
        sample = await get_satellite_service().sample(lat, lon)

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
        change_vs_baseline=sample.change_vs_baseline,
    )
    db.add(rec)
    tree.last_satellite_at = datetime.now(UTC)
    tree.satellite_verified = bool(sample.presence_confirmed)
    await db.flush()
    return rec


async def run_monthly_satellite_sweep(db: AsyncSession) -> dict[str, Any]:
    """Scan all work areas on active planting projects."""
    scanned = 0
    failed = 0
    skipped = 0

    projects_res = await db.execute(
        select(PlantingProject).where(PlantingProject.status.in_(("active", "planning")))
    )
    project_ids = {p.id for p in projects_res.scalars().all()}

    fences_res = await db.execute(
        select(PlantationFence).where(PlantationFence.project_id.isnot(None))
    )
    fences = [f for f in fences_res.scalars().all() if f.project_id in project_ids]

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
    result = {"scanned": scanned, "failed": failed, "skipped": skipped, "total": len(fences)}
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
