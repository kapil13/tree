"""Continuous re-audit cycle management for Estate Watch engagements."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement
from app.services.audit_cycles.service import start_reaudit_cycle as start_kernel_reaudit_cycle

def cycle_summary(engagement: AuditEngagement) -> dict[str, Any]:
    meta = engagement.metadata_ or {}
    return {
        "engagement_id": str(engagement.id),
        "current_cycle": int(meta.get("cycle_number", 1)),
        "status": engagement.status,
        "cycles": list(meta.get("audit_cycles", [])),
        "reaudit_started_at": meta.get("reaudit_started_at"),
    }


async def start_reaudit_cycle(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    notes: str | None = None,
) -> dict[str, Any]:
    if engagement.status != "attested":
        raise ValueError("engagement_not_attested")

    cycle = await start_kernel_reaudit_cycle(
        db,
        engagement,
        started_by_user_id=None,
        trigger_reason=notes,
        trigger_source="legacy_reaudit_endpoint",
    )
    meta = dict(engagement.metadata_ or {})
    meta["cycle_number"] = cycle.cycle_number
    meta["reaudit_started_at"] = datetime.now(UTC).isoformat()
    engagement.metadata_ = meta
    engagement.status = "analysis_ready"
    await db.flush()

    return {
        "engagement_id": str(engagement.id),
        "status": engagement.status,
        "current_cycle": cycle.cycle_number,
        "archived_cycles": cycle.cycle_number - 1,
        "plots_reset": 0,
        "message": "reaudit_cycle_started",
    }
