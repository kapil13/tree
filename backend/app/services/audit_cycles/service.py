"""Transactional lifecycle operations for immutable audit cycles."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_cycle import AuditCycle
from app.models.audit_engagement import AuditEngagement
from app.services.audit_cycles.queries import get_cycle
from app.services.audit_governance.mutability import assert_cycle_can_edit, assert_cycle_is_attested

_FINAL = frozenset({"attested", "superseded", "cancelled"})
CYCLE_TRANSITIONS = {
    "draft": {"analysis_ready", "cancelled"},
    "analysis_ready": {"risk_assessed", "cancelled"},
    "risk_assessed": {"sampling_planned", "cancelled"},
    "sampling_planned": {"field_verification", "cancelled"},
    "field_verification": {"export_ready", "cancelled"},
    "export_ready": {"under_review", "cancelled"},
    "under_review": {"attested", "cancelled"},
}


async def create_cycle(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    started_by_user_id: uuid.UUID | None,
    trigger_reason: str | None = None,
    trigger_source: str | None = None,
    methodology_version: str | None = None,
) -> AuditCycle:
    """Create cycle one only when the engagement has no active audit period."""
    existing = (
        await db.execute(
            select(AuditCycle.id)
            .where(AuditCycle.engagement_id == engagement.id)
            .with_for_update()
        )
    ).scalars().first()
    if existing is not None:
        raise ValueError("audit_cycle_already_exists_use_start_reaudit")
    cycle = AuditCycle(
        engagement_id=engagement.id,
        cycle_number=1,
        status="draft",
        opened_at=datetime.now(UTC),
        started_by_user_id=started_by_user_id,
        trigger_reason=trigger_reason,
        trigger_source=trigger_source,
        methodology_version=methodology_version,
    )
    db.add(cycle)
    try:
        await db.flush()
    except IntegrityError as exc:
        raise ValueError("audit_cycle_already_exists_use_start_reaudit") from exc
    return cycle


async def transition_cycle(
    db: AsyncSession,
    cycle_id: uuid.UUID,
    *,
    target_status: str,
    closed_by_user_id: uuid.UUID | None,
) -> AuditCycle:
    cycle = await get_cycle(db, cycle_id)
    assert_cycle_can_edit(cycle)
    allowed = CYCLE_TRANSITIONS.get(cycle.status, set())
    if target_status not in allowed:
        raise ValueError("invalid_audit_cycle_transition")
    cycle.status = target_status
    if target_status in _FINAL:
        cycle.closed_at = datetime.now(UTC)
        cycle.closed_by_user_id = closed_by_user_id
    await db.flush()
    return cycle


async def start_reaudit_cycle(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    started_by_user_id: uuid.UUID | None,
    trigger_reason: str | None = None,
    trigger_source: str | None = "manual",
    methodology_version: str | None = None,
) -> AuditCycle:
    """Preserve an attested period and open its successor; never reset its data."""
    parent = (
        await db.execute(
            select(AuditCycle)
            .where(AuditCycle.engagement_id == engagement.id)
            .order_by(AuditCycle.cycle_number.desc())
            .with_for_update()
        )
    ).scalars().first()
    assert_cycle_is_attested(parent)
    next_number = parent.cycle_number + 1
    parent.status = "superseded"
    cycle = AuditCycle(
        engagement_id=engagement.id,
        cycle_number=next_number,
        status="draft",
        opened_at=datetime.now(UTC),
        started_by_user_id=started_by_user_id,
        parent_cycle_id=parent.id,
        trigger_reason=trigger_reason,
        trigger_source=trigger_source,
        methodology_version=methodology_version or parent.methodology_version,
    )
    db.add(cycle)
    await db.flush()
    return cycle
