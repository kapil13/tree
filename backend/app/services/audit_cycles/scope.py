"""Cycle-scoped evidence reads and writes for Estate Watch Wave A."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_cycle import AuditCycle
from app.models.audit_engagement import AuditEngagement
from app.services.audit_cycles.queries import get_current_cycle


async def resolve_read_cycle_id(
    db: AsyncSession,
    engagement_id: uuid.UUID,
    *,
    cycle_id: uuid.UUID | None = None,
) -> uuid.UUID | None:
    """Pick the audit cycle whose evidence should be read (explicit > open > latest)."""
    if cycle_id is not None:
        return cycle_id

    open_cycle = await get_current_cycle(db, engagement_id)
    if open_cycle is not None:
        return open_cycle.id

    latest = (
        await db.execute(
            select(AuditCycle)
            .where(AuditCycle.engagement_id == engagement_id)
            .order_by(AuditCycle.cycle_number.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    return latest.id if latest is not None else None


def cycle_or_engagement_filter(
    model: Any,
    *,
    engagement_id: uuid.UUID,
    cycle_id: uuid.UUID | None,
) -> list[Any]:
    """Return SQLAlchemy where clauses preferring cycle scope when available."""
    if cycle_id is not None and hasattr(model, "cycle_id"):
        return [model.cycle_id == cycle_id]
    return [model.engagement_id == engagement_id]


async def attach_cycle_id(
    row: Any,
    *,
    cycle: AuditCycle,
    engagement: AuditEngagement,
) -> None:
    if hasattr(row, "cycle_id"):
        row.cycle_id = cycle.id
    if hasattr(row, "engagement_id"):
        row.engagement_id = engagement.id
