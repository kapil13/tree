"""Append-only audit computation provenance."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_run import AuditRun
from app.services.audit_cycles.queries import get_cycle
from app.services.audit_governance.mutability import assert_cycle_can_analyze


async def start_run(
    db: AsyncSession,
    *,
    cycle_id: uuid.UUID,
    run_type: str,
    created_by: uuid.UUID | None,
    methodology_version: str | None = None,
    application_version: str | None = None,
    algorithm_version: str | None = None,
    parameters: dict[str, Any] | None = None,
    input_manifest_hash: str | None = None,
) -> AuditRun:
    cycle = await get_cycle(db, cycle_id)
    assert_cycle_can_analyze(cycle)
    run = AuditRun(
        cycle_id=cycle_id,
        run_type=run_type,
        status="running",
        started_at=datetime.now(UTC),
        methodology_version=methodology_version or cycle.methodology_version,
        application_version=application_version,
        algorithm_version=algorithm_version,
        parameters=parameters or {},
        input_manifest_hash=input_manifest_hash,
        created_by=created_by,
    )
    db.add(run)
    await db.flush()
    return run


async def complete_run(
    db: AsyncSession, run: AuditRun, *, output_manifest_hash: str | None = None
) -> AuditRun:
    if run.status != "running":
        raise ValueError("audit_run_not_running")
    run.status = "completed"
    run.completed_at = datetime.now(UTC)
    run.output_manifest_hash = output_manifest_hash
    await db.flush()
    return run


async def fail_run(db: AsyncSession, run: AuditRun, *, error_message: str) -> AuditRun:
    if run.status != "running":
        raise ValueError("audit_run_not_running")
    run.status = "failed"
    run.completed_at = datetime.now(UTC)
    run.error_message = error_message
    await db.flush()
    return run
