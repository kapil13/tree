"""Shared portfolio query helpers (Wave C)."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement
from app.models.audit_sampling import AuditFieldPlot
from app.services.audit_sampling.queries import get_active_sampling_plan


async def active_plan_plot_ids(
    db: AsyncSession,
    *,
    cycle_id: uuid.UUID,
) -> list[uuid.UUID]:
    """Plot IDs belonging to the cycle's active sampling plan (Wave B)."""
    plan = await get_active_sampling_plan(db, cycle_id)
    if plan is None:
        return []
    rows = (
        await db.execute(select(AuditFieldPlot.id).where(AuditFieldPlot.plan_id == plan.id))
    ).scalars().all()
    return list(rows)


async def engagement_ids_for_org(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
) -> list[uuid.UUID]:
    rows = (
        await db.execute(
            select(AuditEngagement.id).where(AuditEngagement.organization_id == organization_id)
        )
    ).scalars().all()
    return list(rows)
