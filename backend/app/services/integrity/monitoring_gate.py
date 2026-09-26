"""Project monitoring gates for credit ledger verified transitions (P0)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.services.monitoring.sar_ops_dashboard import build_sar_ops_summary

VERIFIED_MIN_SAR_INTEGRITY = 50.0
VERIFIED_MAX_OPTICAL_STALE_DAYS = 60


async def project_monitoring_gate(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> dict[str, Any]:
    """Return monitoring readiness for ledger verified transition."""
    fences = list(
        (
            await db.execute(
                select(PlantationFence).where(PlantationFence.project_id == project_id)
            )
        ).scalars().all()
    )
    if not fences:
        return {
            "passed": True,
            "fence_count": 0,
            "sar_avg_forest_integrity": None,
            "max_optical_stale_days": None,
            "reasons": [],
            "message": "No work areas — monitoring gate skipped.",
        }

    sar_ops = await build_sar_ops_summary(db, fences)
    sar_avg = sar_ops.get("sar_avg_forest_integrity")
    now = datetime.now(UTC)
    stale_days: list[int] = []
    for fence in fences:
        if fence.last_satellite_at is None:
            stale_days.append(VERIFIED_MAX_OPTICAL_STALE_DAYS + 1)
            continue
        last_at = fence.last_satellite_at
        if last_at.tzinfo is None:
            last_at = last_at.replace(tzinfo=UTC)
        stale_days.append((now - last_at).days)

    max_optical_stale = max(stale_days) if stale_days else None
    reasons: list[str] = []
    if sar_avg is not None and float(sar_avg) < VERIFIED_MIN_SAR_INTEGRITY:
        reasons.append("sar_integrity_below_minimum")
    if max_optical_stale is not None and max_optical_stale > VERIFIED_MAX_OPTICAL_STALE_DAYS:
        reasons.append("optical_scan_stale")

    passed = len(reasons) == 0
    message_parts: list[str] = []
    if sar_avg is not None:
        message_parts.append(f"SAR avg integrity {sar_avg:.1f} (min {VERIFIED_MIN_SAR_INTEGRITY:.0f})")
    if max_optical_stale is not None:
        message_parts.append(
            f"oldest optical scan {max_optical_stale}d ago (max {VERIFIED_MAX_OPTICAL_STALE_DAYS}d)"
        )
    return {
        "passed": passed,
        "fence_count": len(fences),
        "sar_avg_forest_integrity": sar_avg,
        "max_optical_stale_days": max_optical_stale,
        "verified_requirements": {
            "min_sar_integrity": VERIFIED_MIN_SAR_INTEGRITY,
            "max_optical_stale_days": VERIFIED_MAX_OPTICAL_STALE_DAYS,
        },
        "reasons": reasons,
        "message": "; ".join(message_parts) if message_parts else "Monitoring gate passed.",
    }
