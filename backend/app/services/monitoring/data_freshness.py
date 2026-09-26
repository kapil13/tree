"""Staleness metadata for monitoring read paths."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.services.monitoring.monitoring_constants import (
    SATELLITE_HEALTH_STALE_HOURS,
    STALE_SAR_DAYS,
    VERIFIED_MAX_OPTICAL_STALE_DAYS,
)
from app.services.monitoring.sar_portfolio import sar_fence_snapshot
from app.services.satellite.sar_service import is_sar_provider_record


def _parse_iso(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


def _hours_since(ts: datetime | None) -> int | None:
    if ts is None:
        return None
    return int((datetime.now(UTC) - ts).total_seconds() // 3600)


def _days_since(ts: datetime | None) -> int | None:
    if ts is None:
        return None
    return (datetime.now(UTC) - ts).days


async def _latest_optical_scene(
    db: AsyncSession,
    fence_id: uuid.UUID,
) -> PlantationSatelliteRecord | None:
    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id == fence_id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
        .limit(8)
    )
    for row in res.scalars().all():
        if not is_sar_provider_record(row.provider):
            return row
    return None


async def build_site_data_freshness(
    db: AsyncSession,
    fence_id: uuid.UUID,
    *,
    intel: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Summarize how fresh the inputs behind a threat-watch site are."""
    intel = intel or {}
    sar = await sar_fence_snapshot(db, fence_id)
    optical = await _latest_optical_scene(db, fence_id)

    sat_health = intel.get("satellite_health") or {}
    sat_at = _parse_iso(sat_health.get("created_at"))
    sat_age_hours = _hours_since(sat_at)

    weather = intel.get("weather") or {}
    weather_generated = _parse_iso(weather.get("generated_at") if isinstance(weather, dict) else None)

    optical_days = _days_since(optical.scene_acquired_at) if optical else None

    return {
        "satellite_health_at": sat_at.isoformat() if sat_at else None,
        "satellite_health_age_hours": sat_age_hours,
        "satellite_health_stale": sat_age_hours is None or sat_age_hours > SATELLITE_HEALTH_STALE_HOURS,
        "weather_generated_at": weather_generated.isoformat() if weather_generated else None,
        "optical_last_at": optical.scene_acquired_at.isoformat() if optical and optical.scene_acquired_at else None,
        "optical_stale_days": optical_days,
        "optical_stale": optical_days is None or optical_days > VERIFIED_MAX_OPTICAL_STALE_DAYS,
        "sar_last_at": sar.get("last_sar_at"),
        "sar_stale": bool(sar.get("sar_stale")),
        "sar_live": bool(sar.get("sar_live")),
        "sar_provider": sar.get("sar_provider"),
        "sar_provider_mode": "live" if sar.get("sar_live") else ("stub" if sar.get("sar_provider") else "none"),
        "optical_max_stale_days": VERIFIED_MAX_OPTICAL_STALE_DAYS,
        "sar_max_stale_days": STALE_SAR_DAYS,
        "ndvi_source": "ecosystem" if intel.get("ndvi_trend") else "unknown",
        "days_since_sar_scan": sar.get("days_since_sar_scan"),
    }
