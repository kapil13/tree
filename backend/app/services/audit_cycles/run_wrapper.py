"""Wrap deterministic Estate Watch computations with append-only audit runs."""

from __future__ import annotations

import hashlib
import json
import uuid
from collections.abc import Awaitable, Callable
from typing import Any, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_cycle import AuditCycle
from app.models.audit_run import AuditRun
from app.services.audit_cycles.runs import complete_run, fail_run, start_run
from app.services.audit_governance.methodology import ESTATE_WATCH_METHODOLOGY_VERSION

T = TypeVar("T")


def output_manifest_hash(payload: Any) -> str:
    if isinstance(payload, dict):
        body = payload
    elif isinstance(payload, list):
        body = {"count": len(payload), "items": [str(getattr(i, "id", i)) for i in payload[:20]]}
    else:
        body = {"result": str(payload)}
    raw = json.dumps(body, sort_keys=True, default=str).encode()
    return hashlib.sha256(raw).hexdigest()


async def execute_audit_run(
    db: AsyncSession,
    cycle: AuditCycle,
    *,
    run_type: str,
    created_by: uuid.UUID | None,
    work: Callable[[], Awaitable[T]],
    parameters: dict[str, Any] | None = None,
    input_manifest_hash: str | None = None,
) -> tuple[T, AuditRun]:
    run = await start_run(
        db,
        cycle_id=cycle.id,
        run_type=run_type,
        created_by=created_by,
        methodology_version=cycle.methodology_version or ESTATE_WATCH_METHODOLOGY_VERSION,
        parameters=parameters,
        input_manifest_hash=input_manifest_hash,
    )
    try:
        result = await work()
        await complete_run(db, run, output_manifest_hash=output_manifest_hash(result))
        return result, run
    except Exception as exc:
        await fail_run(db, run, error_message=str(exc)[:500])
        raise
