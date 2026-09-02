"""Load satellite context for integrity fusion."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.satellite import SatelliteRecord


async def latest_tree_satellite(
    db: AsyncSession, tree_id: uuid.UUID
) -> SatelliteRecord | None:
    res = await db.execute(
        select(SatelliteRecord)
        .where(SatelliteRecord.tree_id == tree_id)
        .order_by(SatelliteRecord.scene_acquired_at.desc())
        .limit(1)
    )
    return res.scalar_one_or_none()


async def work_area_ndvi_baseline(
    db: AsyncSession, work_area_id: uuid.UUID | None
) -> float | None:
    if work_area_id is None:
        return None
    fence = await db.get(PlantationFence, work_area_id)
    if fence is None:
        return None
    meta = fence.metadata_ or {}
    baseline = meta.get("baseline_indices")
    if isinstance(baseline, dict) and baseline.get("ndvi_mean") is not None:
        return float(baseline["ndvi_mean"])
    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id == work_area_id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.asc())
        .limit(1)
    )
    rec = res.scalar_one_or_none()
    if rec and rec.ndvi_mean is not None:
        return float(rec.ndvi_mean)
    return None


async def satellite_context_for_tree(
    db: AsyncSession, tree_id: uuid.UUID, plantation_id: uuid.UUID | None
) -> dict[str, Any]:
    sat = await latest_tree_satellite(db, tree_id)
    baseline = await work_area_ndvi_baseline(db, plantation_id)
    if sat is None:
        return {"ndvi_mean": None, "presence_confirmed": None, "change_vs_baseline": None, "baseline": baseline}
    return {
        "ndvi_mean": float(sat.ndvi_mean) if sat.ndvi_mean is not None else None,
        "presence_confirmed": sat.presence_confirmed,
        "change_vs_baseline": float(sat.change_vs_baseline) if sat.change_vs_baseline is not None else None,
        "baseline": baseline,
    }
