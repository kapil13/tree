"""Persist confidence vs field reconciliation (Wave B / P6)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_cycle import AuditCycle
from app.models.audit_engagement import AuditEngagement
from app.models.audit_reconciliation import AuditReconciliationBlock, AuditReconciliationRun
from app.services.audit_cycles.run_wrapper import execute_audit_run
from app.services.audit_export.reconciliation import build_confidence_field_reconciliation


async def persist_reconciliation_run(
    db: AsyncSession,
    engagement: AuditEngagement,
    cycle: AuditCycle,
    *,
    created_by: uuid.UUID | None = None,
) -> AuditReconciliationRun:
    async def _compute() -> dict[str, Any]:
        return await build_confidence_field_reconciliation(
            db, engagement.id, cycle_id=cycle.id
        )

    summary, audit_run = await execute_audit_run(
        db,
        cycle,
        run_type="field_reconciliation",
        created_by=created_by,
        work=_compute,
    )

    run = AuditReconciliationRun(
        cycle_id=cycle.id,
        engagement_id=engagement.id,
        audit_run_id=audit_run.id,
        aligned_count=summary.get("aligned_count", 0),
        mismatch_count=summary.get("mismatch_count", 0),
        no_field_data_count=summary.get("no_field_data_count", 0),
        block_count=summary.get("block_count", 0),
        computed_at=datetime.now(UTC),
    )
    db.add(run)
    await db.flush()

    for block in summary.get("blocks") or []:
        db.add(
            AuditReconciliationBlock(
                run_id=run.id,
                boundary_version_id=uuid.UUID(block["boundary_version_id"]),
                confidence_grade=block.get("confidence_grade"),
                confidence_score=block.get("confidence_score"),
                field_grade=block.get("field_grade"),
                field_signal=block.get("field_signal"),
                visit_count=int(block.get("visit_count") or 0),
                reconciliation=block["reconciliation"],
                aligned=block.get("aligned"),
                details={
                    "tree_presence_counts": block.get("tree_presence_counts") or {},
                    "outcome_counts": block.get("outcome_counts") or {},
                    "boundary_name": block.get("boundary_name"),
                },
            )
        )
    await db.flush()
    return run


async def latest_reconciliation_run(
    db: AsyncSession,
    cycle_id: uuid.UUID,
) -> AuditReconciliationRun | None:
    return (
        await db.execute(
            select(AuditReconciliationRun)
            .where(AuditReconciliationRun.cycle_id == cycle_id)
            .order_by(AuditReconciliationRun.computed_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
