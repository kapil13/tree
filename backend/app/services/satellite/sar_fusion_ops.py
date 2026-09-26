"""Load optical + SAR records and build fusion analyses."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.satellite import SatelliteRecord
from app.services.monitoring.sar_sweep import (
    latest_sar_record_for_fence,
    latest_sar_record_for_tree,
    serialize_sar_record,
)
from app.services.satellite.sar_fusion import OpticalContext, analyze_sar_fusion, fusion_to_dict
from app.services.satellite.sar_service import is_sar_provider_record
from app.services.satellite.sar_types import SarSample


def _sample_from_serialized(data: dict[str, Any]) -> SarSample:
    return SarSample(
        provider=data["provider"],
        scene_id=data["scene_id"],
        scene_acquired_at=data["scene_acquired_at"],
        l_band_hh_db=float(data["l_band_hh_db"] or 0),
        s_band_hh_db=float(data["s_band_hh_db"] or 0),
        vh_hv_ratio=data.get("vh_hv_ratio"),
        double_bounce_index=float(data.get("double_bounce_index") or 0),
        wetland_probability=float(data.get("wetland_probability") or 0),
        ground_moisture_index=float(data.get("ground_moisture_index") or 0),
        canopy_ground_mismatch=bool(data.get("canopy_ground_mismatch")),
        frequency_bands=data.get("frequency_bands") or ["L", "S"],
        polarimetric_composite=data.get("polarimetric_composite"),
        coherence=data.get("coherence"),
        pipeline=(data.get("analysis") or {}).get("pipeline", "byot-sar-1.0.0"),
    )


async def _latest_optical_tree(db: AsyncSession, tree_id: uuid.UUID) -> OpticalContext | None:
    res = await db.execute(
        select(SatelliteRecord)
        .where(SatelliteRecord.tree_id == tree_id)
        .order_by(SatelliteRecord.scene_acquired_at.desc())
        .limit(8)
    )
    for row in res.scalars().all():
        if is_sar_provider_record(row.provider):
            continue
        return OpticalContext(
            ndvi_mean=float(row.ndvi_mean) if row.ndvi_mean is not None else None,
            cloud_cover_pct=float(row.cloud_cover_pct) if row.cloud_cover_pct is not None else None,
            scene_acquired_at=row.scene_acquired_at,
            provider=row.provider,
        )
    return None


async def _latest_optical_fence(db: AsyncSession, fence_id: uuid.UUID) -> OpticalContext | None:
    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id == fence_id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
        .limit(8)
    )
    for row in res.scalars().all():
        if is_sar_provider_record(row.provider):
            continue
        return OpticalContext(
            ndvi_mean=float(row.ndvi_mean) if row.ndvi_mean is not None else None,
            cloud_cover_pct=float(row.cloud_cover_pct) if row.cloud_cover_pct is not None else None,
            scene_acquired_at=row.scene_acquired_at,
            provider=row.provider,
        )
    return None


async def build_tree_sar_fusion(db: AsyncSession, tree_id: uuid.UUID) -> dict[str, Any] | None:
    sar_rec = await latest_sar_record_for_tree(db, tree_id)
    if sar_rec is None:
        return None
    serialized = serialize_sar_record(sar_rec)
    sample = _sample_from_serialized(serialized)
    optical = await _latest_optical_tree(db, tree_id)
    fusion = analyze_sar_fusion(sample, optical=optical)
    return {
        "tree_id": str(tree_id),
        "sar_record_id": str(sar_rec.id),
        **fusion_to_dict(fusion),
    }


async def build_fence_sar_fusion(db: AsyncSession, fence_id: uuid.UUID) -> dict[str, Any] | None:
    sar_rec = await latest_sar_record_for_fence(db, fence_id)
    if sar_rec is None:
        return None
    serialized = serialize_sar_record(sar_rec)
    sample = _sample_from_serialized(serialized)
    optical = await _latest_optical_fence(db, fence_id)
    fusion = analyze_sar_fusion(sample, optical=optical)
    return {
        "fence_id": str(fence_id),
        "sar_record_id": str(sar_rec.id),
        **fusion_to_dict(fusion),
    }
