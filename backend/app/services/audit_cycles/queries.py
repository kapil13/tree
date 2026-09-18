from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_cycle import AuditCycle


async def get_cycle(db: AsyncSession, cycle_id: uuid.UUID) -> AuditCycle | None:
    return await db.get(AuditCycle, cycle_id)


async def get_current_cycle(db: AsyncSession, engagement_id: uuid.UUID) -> AuditCycle | None:
    return (
        await db.execute(
            select(AuditCycle)
            .where(
                AuditCycle.engagement_id == engagement_id,
                AuditCycle.status.not_in(("attested", "superseded", "cancelled")),
            )
            .order_by(AuditCycle.cycle_number.desc())
        )
    ).scalar_one_or_none()


async def list_cycles(db: AsyncSession, engagement_id: uuid.UUID) -> list[AuditCycle]:
    return list(
        (
            await db.execute(
                select(AuditCycle)
                .where(AuditCycle.engagement_id == engagement_id)
                .order_by(AuditCycle.cycle_number.asc())
            )
        ).scalars()
    )
