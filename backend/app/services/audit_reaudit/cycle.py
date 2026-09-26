"""Continuous re-audit cycle management for Estate Watch engagements."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement
from app.services.audit_cycles.queries import list_cycles
from app.services.audit_cycles.service import start_reaudit_cycle as start_kernel_reaudit_cycle
from app.services.audit_governance.engagement import CYCLE_STATUS_FOR_ENGAGEMENT


async def cycle_summary(db: AsyncSession, engagement: AuditEngagement) -> dict[str, Any]:
    cycles = await list_cycles(db, engagement.id)
    current = max((c.cycle_number for c in cycles), default=1)
    return {
        "engagement_id": str(engagement.id),
        "current_cycle": current,
        "status": engagement.status,
        "cycles": [
            {
                "id": str(c.id),
                "cycle_number": c.cycle_number,
                "status": c.status,
                "parent_cycle_id": str(c.parent_cycle_id) if c.parent_cycle_id else None,
                "trigger_reason": c.trigger_reason,
                "trigger_source": c.trigger_source,
                "opened_at": c.opened_at.isoformat(),
                "closed_at": c.closed_at.isoformat() if c.closed_at else None,
                "engagement_status": CYCLE_STATUS_FOR_ENGAGEMENT.get(c.status),
            }
            for c in cycles
        ],
        "reaudit_started_at": (engagement.metadata_ or {}).get("reaudit_started_at"),
    }


async def start_reaudit_cycle(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    notes: str | None = None,
    started_by_user_id=None,
) -> dict[str, Any]:
    if engagement.status != "attested":
        raise ValueError("engagement_not_attested")

    cycle = await start_kernel_reaudit_cycle(
        db,
        engagement,
        started_by_user_id=started_by_user_id,
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
        "parent_cycle_id": str(cycle.parent_cycle_id) if cycle.parent_cycle_id else None,
    }
