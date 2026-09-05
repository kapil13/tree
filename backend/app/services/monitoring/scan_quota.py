"""Per-run and per-org scan quotas to control Sentinel Hub usage."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.monitoring_scan_target import MonitoringScanTarget


async def count_org_scans_since(
    db: AsyncSession, organization_id: uuid.UUID, since: datetime
) -> int:
    res = await db.execute(
        select(func.count(MonitoringScanTarget.id)).where(
            MonitoringScanTarget.organization_id == organization_id,
            MonitoringScanTarget.last_scan_at.isnot(None),
            MonitoringScanTarget.last_scan_at >= since,
        )
    )
    return int(res.scalar_one() or 0)


async def org_may_scan(
    db: AsyncSession,
    organization_id: uuid.UUID | None,
    *,
    scans_in_this_run: int,
    run_limit: int | None = None,
) -> bool:
    if organization_id is None:
        return scans_in_this_run < (run_limit or settings.monitoring_tree_scan_batch_limit)
    since = datetime.now(UTC) - timedelta(days=1)
    used = await count_org_scans_since(db, organization_id, since)
    return used < settings.monitoring_org_daily_scan_limit
