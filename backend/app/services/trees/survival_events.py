"""Record tree survival / mortality events."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tree import Tree
from app.models.tree_survival_event import TreeSurvivalEvent
from app.models.user import User
from app.schemas.tree_survival import TreeSurvivalEventCreate, TreeSurvivalEventOut

_SURVIVAL_STATUS_MAP = {
    "alive": "alive",
    "live": "alive",
    "healthy": "alive",
    "dead": "dead",
    "mortality": "dead",
    "removed": "removed",
    "stressed": "stressed",
    "unknown": "unknown",
}


def normalize_survival_status(raw: str | None) -> str:
    if not raw:
        return "unknown"
    return _SURVIVAL_STATUS_MAP.get(raw.strip().lower(), raw.strip().lower())


async def record_survival_event(
    db: AsyncSession,
    *,
    tree: Tree,
    payload: TreeSurvivalEventCreate,
    recorder: User | None = None,
) -> TreeSurvivalEventOut:
    status = normalize_survival_status(payload.status)
    event = TreeSurvivalEvent(
        tree_id=tree.id,
        event_at=payload.event_at or datetime.now(UTC),
        status=status,
        cause=payload.cause,
        evidence_key=payload.evidence_key,
        recorded_by_id=recorder.id if recorder else None,
    )
    db.add(event)
    await db.flush()
    return TreeSurvivalEventOut.model_validate(event)
