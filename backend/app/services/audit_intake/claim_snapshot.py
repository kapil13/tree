"""Working claim and immutable snapshot freeze."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement, ClaimSnapshot

EPISTEMIC_CLAIM = "CLAIM"


def _canonical_json(data: dict[str, Any]) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), default=str)


def content_hash(claim_data: dict[str, Any]) -> str:
    return hashlib.sha256(_canonical_json(claim_data).encode()).hexdigest()


async def get_working_claim(engagement: AuditEngagement) -> dict[str, Any]:
    meta = engagement.metadata_ or {}
    return dict(meta.get("working_claim") or {})


async def update_working_claim(
    db: AsyncSession,
    engagement: AuditEngagement,
    claim: dict[str, Any],
) -> dict[str, Any]:
    meta = dict(engagement.metadata_ or {})
    meta["working_claim"] = claim
    engagement.metadata_ = meta
    await db.flush()
    return claim


async def freeze_claim_snapshot(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    created_by_user_id: uuid.UUID | None,
) -> ClaimSnapshot:
    claim_data = await get_working_claim(engagement)
    if not claim_data:
        raise ValueError("empty_claim")

    version_row = await db.execute(
        select(func.coalesce(func.max(ClaimSnapshot.version), 0)).where(
            ClaimSnapshot.engagement_id == engagement.id
        )
    )
    next_version = int(version_row.scalar_one()) + 1

    snapshot = ClaimSnapshot(
        engagement_id=engagement.id,
        version=next_version,
        claim_data=claim_data,
        content_hash=content_hash(claim_data),
        epistemic_label=EPISTEMIC_CLAIM,
        frozen_at=datetime.now(UTC),
        created_by_user_id=created_by_user_id,
    )
    db.add(snapshot)
    await db.flush()
    return snapshot


async def latest_snapshot(db: AsyncSession, engagement_id: uuid.UUID) -> ClaimSnapshot | None:
    row = await db.execute(
        select(ClaimSnapshot)
        .where(ClaimSnapshot.engagement_id == engagement_id)
        .order_by(ClaimSnapshot.version.desc())
        .limit(1)
    )
    return row.scalar_one_or_none()
