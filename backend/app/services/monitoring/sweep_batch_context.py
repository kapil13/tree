"""Batch-loaded satellite/SAR context for portfolio sweep jobs."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.user import User
from app.services.monitoring.monitoring_constants import VERIFIED_MAX_OPTICAL_STALE_DAYS
from app.services.satellite.sar_fusion import OpticalContext
from app.services.satellite.sar_service import is_sar_provider_record

MIN_BASELINE_SAMPLES = 2
DEFAULT_RECORDS_PER_FENCE = 20


def optical_context_from_fence_records(
    records: list[PlantationSatelliteRecord],
    *,
    max_stale_days: int = VERIFIED_MAX_OPTICAL_STALE_DAYS,
) -> OpticalContext | None:
    now = datetime.now(UTC)
    for row in records:
        if is_sar_provider_record(row.provider):
            continue
        if row.scene_acquired_at is not None:
            age_days = (now - row.scene_acquired_at).days
            if age_days > max_stale_days:
                continue
        return OpticalContext(
            ndvi_mean=float(row.ndvi_mean) if row.ndvi_mean is not None else None,
            cloud_cover_pct=float(row.cloud_cover_pct) if row.cloud_cover_pct is not None else None,
            scene_acquired_at=row.scene_acquired_at,
            provider=row.provider,
        )
    return None


def latest_sar_record_from_fence_records(
    records: list[PlantationSatelliteRecord],
) -> PlantationSatelliteRecord | None:
    for row in records:
        if is_sar_provider_record(row.provider):
            return row
    return None


def baseline_ndvi_change_from_fence_records(
    records: list[PlantationSatelliteRecord],
    current_ndvi: float,
) -> float:
    if len(records) < MIN_BASELINE_SAMPLES:
        return 0.0
    baseline_vals = [float(r.ndvi_mean) for r in records[1:] if r.ndvi_mean is not None]
    if not baseline_vals:
        return 0.0
    baseline = sum(baseline_vals) / len(baseline_vals)
    return round(current_ndvi - baseline, 4)


def recent_ndvi_values_from_fence_records(
    records: list[PlantationSatelliteRecord],
    *,
    limit: int = 6,
) -> list[float]:
    values: list[float] = []
    for row in records:
        if row.ndvi_mean is None:
            continue
        values.append(float(row.ndvi_mean))
        if len(values) >= limit:
            break
    return values


async def _fetch_fence_satellite_records(
    db: AsyncSession,
    fence_ids: list[uuid.UUID],
    *,
    records_per_fence: int = DEFAULT_RECORDS_PER_FENCE,
) -> dict[uuid.UUID, list[PlantationSatelliteRecord]]:
    if not fence_ids:
        return {}

    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id.in_(fence_ids))
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
        .limit(max(len(fence_ids) * records_per_fence, records_per_fence))
    )
    by_fence: dict[uuid.UUID, list[PlantationSatelliteRecord]] = {fid: [] for fid in fence_ids}
    for rec in res.scalars().all():
        bucket = by_fence.setdefault(rec.fence_id, [])
        if len(bucket) < records_per_fence:
            bucket.append(rec)
    return by_fence


async def _fetch_users_by_id(db: AsyncSession, user_ids: set[uuid.UUID]) -> dict[uuid.UUID, User]:
    if not user_ids:
        return {}
    res = await db.execute(select(User).where(User.id.in_(user_ids)))
    return {user.id: user for user in res.scalars().all()}


@dataclass
class FenceSarBatchContext:
    records_by_fence: dict[uuid.UUID, list[PlantationSatelliteRecord]] = field(default_factory=dict)
    owners_by_id: dict[uuid.UUID, User] = field(default_factory=dict)

    def optical_context(self, fence_id: uuid.UUID) -> OpticalContext | None:
        return optical_context_from_fence_records(self.records_by_fence.get(fence_id, []))

    def prior_sar_record(self, fence_id: uuid.UUID) -> PlantationSatelliteRecord | None:
        return latest_sar_record_from_fence_records(self.records_by_fence.get(fence_id, []))

    def owner(self, user_id: uuid.UUID | None) -> User | None:
        if user_id is None:
            return None
        return self.owners_by_id.get(user_id)


async def build_fence_sar_batch_context(
    db: AsyncSession,
    fences: list,
    *,
    records_per_fence: int = DEFAULT_RECORDS_PER_FENCE,
) -> FenceSarBatchContext:
    fence_ids = [f.id for f in fences]
    records_by_fence = await _fetch_fence_satellite_records(
        db,
        fence_ids,
        records_per_fence=records_per_fence,
    )
    owner_ids = {f.owner_user_id for f in fences if f.owner_user_id}
    owners_by_id = await _fetch_users_by_id(db, owner_ids)
    return FenceSarBatchContext(
        records_by_fence=records_by_fence,
        owners_by_id=owners_by_id,
    )


@dataclass
class FenceSatelliteBatchContext:
    records_by_fence: dict[uuid.UUID, list[PlantationSatelliteRecord]] = field(default_factory=dict)
    owners_by_id: dict[uuid.UUID, User] = field(default_factory=dict)

    def baseline_ndvi_change(self, fence_id: uuid.UUID, current_ndvi: float) -> float:
        return baseline_ndvi_change_from_fence_records(
            self.records_by_fence.get(fence_id, []),
            current_ndvi,
        )

    def recent_ndvi_values(self, fence_id: uuid.UUID) -> list[float]:
        return recent_ndvi_values_from_fence_records(self.records_by_fence.get(fence_id, []))

    def owner(self, user_id: uuid.UUID | None) -> User | None:
        if user_id is None:
            return None
        return self.owners_by_id.get(user_id)


async def build_fence_satellite_batch_context(
    db: AsyncSession,
    fences: list,
    *,
    records_per_fence: int = 8,
) -> FenceSatelliteBatchContext:
    fence_ids = [f.id for f in fences]
    records_by_fence = await _fetch_fence_satellite_records(
        db,
        fence_ids,
        records_per_fence=records_per_fence,
    )
    owner_ids = {f.owner_user_id for f in fences if f.owner_user_id}
    owners_by_id = await _fetch_users_by_id(db, owner_ids)
    return FenceSatelliteBatchContext(
        records_by_fence=records_by_fence,
        owners_by_id=owners_by_id,
    )
