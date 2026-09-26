"""Sampling plan queries for Estate Watch Wave B."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_sampling import AuditSamplingPlan


async def get_active_sampling_plan(
    db: AsyncSession,
    cycle_id: uuid.UUID,
) -> AuditSamplingPlan | None:
    """Return the active plan for a cycle (latest version if multiple active)."""
    return (
        await db.execute(
            select(AuditSamplingPlan)
            .where(
                AuditSamplingPlan.cycle_id == cycle_id,
                AuditSamplingPlan.status == "active",
            )
            .order_by(AuditSamplingPlan.plan_version.desc())
        )
    ).scalar_one_or_none()


async def get_latest_plan_version(db: AsyncSession, cycle_id: uuid.UUID) -> int:
    row = (
        await db.execute(
            select(AuditSamplingPlan.plan_version)
            .where(AuditSamplingPlan.cycle_id == cycle_id)
            .order_by(AuditSamplingPlan.plan_version.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    return int(row or 0)
