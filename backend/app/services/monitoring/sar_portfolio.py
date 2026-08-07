"""SAR portfolio helpers for supervisor monitoring dashboards."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.monitoring.sar_fusion_alerts import STALE_SAR_DAYS, fusion_from_metadata
from app.services.monitoring.sar_sweep import latest_sar_record_for_fence, serialize_sar_record
from app.services.satellite.sar_service import is_sar_provider_record


def _days_since(ts: datetime | None) -> int | None:
    if ts is None:
        return None
    return (datetime.now(UTC) - ts).days


async def sar_fence_snapshot(db: AsyncSession, fence_id: uuid.UUID) -> dict[str, Any]:
    rec = await latest_sar_record_for_fence(db, fence_id)
    if rec is None:
        return {
            "last_sar_at": None,
            "days_since_sar_scan": None,
            "sar_provider": None,
            "sar_forest_integrity": None,
            "sar_integrity_grade": None,
            "sar_monitoring_mode": None,
            "sar_ground_status": None,
            "sar_stale": True,
            "sar_live": False,
        }

    serialized = serialize_sar_record(rec)
    fusion = serialized.get("fusion") or fusion_from_metadata(rec.raw_metadata) or {}
    analysis = fusion.get("sar_analysis") or serialized.get("analysis") or {}
    days = _days_since(rec.scene_acquired_at)
    integrity = fusion.get("forest_integrity_score")
    grade = fusion.get("integrity_grade")
    at_risk = False
    if integrity is not None:
        at_risk = float(integrity) < 50 or grade in {"at_risk", "critical"}

    return {
        "last_sar_at": rec.scene_acquired_at.isoformat() if rec.scene_acquired_at else None,
        "days_since_sar_scan": days,
        "sar_provider": rec.provider,
        "sar_forest_integrity": integrity,
        "sar_integrity_grade": grade,
        "sar_monitoring_mode": fusion.get("monitoring_mode"),
        "sar_ground_status": analysis.get("ground_status"),
        "sar_stale": days is None or days > STALE_SAR_DAYS,
        "sar_live": is_sar_provider_record(rec.provider) and "stub" not in (rec.provider or "").lower(),
        "sar_at_risk": at_risk,
    }


async def list_at_risk_fence_ids(
    db: AsyncSession,
    fence_ids: list[uuid.UUID],
    *,
    min_days_since_scan: int = 7,
    limit: int = 25,
) -> list[uuid.UUID]:
    """Fences needing re-scan: at-risk integrity and not scanned recently."""
    candidates: list[tuple[tuple[int, float], uuid.UUID]] = []
    for fence_id in fence_ids:
        snap = await sar_fence_snapshot(db, fence_id)
        if not snap.get("sar_at_risk"):
            continue
        days = snap.get("days_since_sar_scan")
        if days is not None and days < min_days_since_scan:
            continue
        mode = snap.get("sar_monitoring_mode") or ""
        score = snap.get("sar_forest_integrity")
        priority = 0 if mode == "optical_sar_divergent" else 1
        sort_key = (priority, float(score) if score is not None else 100.0)
        candidates.append((sort_key, fence_id))

    candidates.sort(key=lambda row: row[0])
    return [fid for _, fid in candidates[:limit]]
