"""GBIF + IUCN biodiversity baseline snapshots per work area."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.plantation_fence import PlantationFence
from app.models.work_area_biodiversity_snapshot import WorkAreaBiodiversitySnapshot
from app.services.bioacoustic.regional_fauna import build_regional_fauna
from app.services.geo import geography_to_geojson_polygon, polygon_centroid

log = get_logger("intelligence.biodiversity")

SNAPSHOT_MIN_AGE_DAYS = 25


async def capture_fence_biodiversity_snapshot(
    db: AsyncSession,
    fence: PlantationFence,
) -> str:
    boundary = geography_to_geojson_polygon(fence.boundary)
    lat, lon = polygon_centroid(boundary)

    recent = (
        await db.execute(
            select(WorkAreaBiodiversitySnapshot)
            .where(WorkAreaBiodiversitySnapshot.fence_id == fence.id)
            .order_by(WorkAreaBiodiversitySnapshot.captured_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if recent and recent.captured_at > datetime.now(UTC) - timedelta(days=SNAPSHOT_MIN_AGE_DAYS):
        return "skipped"

    try:
        fauna = build_regional_fauna(lat, lon, limit=40)
    except Exception as exc:
        log.warning("biodiversity_snapshot_failed", fence_id=str(fence.id), error=str(exc))
        return "failed"

    species = fauna.get("species") or []
    snap = WorkAreaBiodiversitySnapshot(
        fence_id=fence.id,
        captured_at=datetime.now(UTC),
        species_count=len(species),
        species=species,
        sources=fauna.get("metadata") or {"gbif": True, "iucn": True},
    )
    db.add(snap)
    await db.flush()
    return "captured"


async def run_biodiversity_baseline(db: AsyncSession) -> dict[str, Any]:
    scanned = 0
    skipped = 0
    failed = 0

    res = await db.execute(
        select(PlantationFence).where(PlantationFence.project_id.isnot(None))
    )
    for fence in res.scalars().all():
        outcome = await capture_fence_biodiversity_snapshot(db, fence)
        if outcome == "captured":
            scanned += 1
        elif outcome == "skipped":
            skipped += 1
        else:
            failed += 1

    await db.commit()
    result = {"scanned": scanned, "skipped": skipped, "failed": failed}
    log.info("biodiversity_baseline.complete", **result)
    return result
