"""Scheduled per-tree satellite scans driven by monitoring_scan_targets."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.logging import get_logger
from app.models.monitoring_scan_target import MonitoringScanTarget
from app.models.satellite import SatelliteRecord
from app.models.tree import Tree
from app.models.user import User
from app.services.monitoring.satellite_sweep import scan_and_persist_tree
from app.services.monitoring.scan_quota import org_may_scan
from app.services.monitoring.scan_targets import mark_target_scanned

log = get_logger("monitoring.tree_tile_sweep")


async def _recent_tree_ndvi_values(db: AsyncSession, tree_id: uuid.UUID) -> list[float]:
    res = await db.execute(
        select(SatelliteRecord)
        .where(SatelliteRecord.tree_id == tree_id, SatelliteRecord.ndvi_mean.isnot(None))
        .order_by(SatelliteRecord.scene_acquired_at.desc())
        .limit(6)
    )
    return [float(r.ndvi_mean) for r in res.scalars().all() if r.ndvi_mean is not None]


async def run_tree_scan_sweep(
    db: AsyncSession,
    *,
    batch_limit: int | None = None,
) -> dict[str, Any]:
    """Scan trees whose monitoring_scan_targets.next_due_at has passed."""
    limit = batch_limit or settings.monitoring_tree_scan_batch_limit
    now = datetime.now(UTC)
    res = await db.execute(
        select(MonitoringScanTarget)
        .where(
            MonitoringScanTarget.target_type == "tree",
            MonitoringScanTarget.tree_id.isnot(None),
            MonitoringScanTarget.next_due_at.isnot(None),
            MonitoringScanTarget.next_due_at <= now,
        )
        .order_by(MonitoringScanTarget.next_due_at.asc())
        .limit(limit)
    )
    targets = list(res.scalars().all())
    scanned = failed = skipped_quota = 0
    org_run_counts: dict[uuid.UUID | None, int] = {}

    for target in targets:
        org_key = target.organization_id
        org_run_counts[org_key] = org_run_counts.get(org_key, 0) + 1
        if not await org_may_scan(
            db, target.organization_id, scans_in_this_run=org_run_counts[org_key]
        ):
            skipped_quota += 1
            continue

        tree = (
            await db.execute(
                select(Tree)
                .options(selectinload(Tree.planting_program))
                .where(Tree.id == target.tree_id, Tree.status != "removed")
            )
        ).scalar_one_or_none()
        if tree is None:
            target.next_due_at = now
            failed += 1
            continue

        owner = (
            await db.get(User, target.owner_user_id or tree.owner_user_id)
            if (target.owner_user_id or tree.owner_user_id)
            else None
        )
        rec = await scan_and_persist_tree(db, tree, notify_user=owner)
        if rec:
            scanned += 1
            await mark_target_scanned(db, target)
        else:
            failed += 1
            target.next_due_at = now + timedelta(hours=6)

    await db.commit()
    result = {
        "due": len(targets),
        "scanned": scanned,
        "failed": failed,
        "skipped_quota": skipped_quota,
        "batch_limit": limit,
    }
    log.info("tree_scan_sweep.complete", **result)
    return result


async def register_due_trees_without_targets(
    db: AsyncSession, *, limit: int = 200
) -> int:
    """Lazy-enrol trees missing from monitoring_scan_targets."""
    from app.services.monitoring.scan_targets import ensure_tree_scan_target

    subq = select(MonitoringScanTarget.tree_id).where(MonitoringScanTarget.tree_id.isnot(None))
    res = await db.execute(
        select(Tree)
        .options(selectinload(Tree.planting_program))
        .where(Tree.status != "removed", Tree.id.notin_(subq))
        .limit(limit)
    )
    count = 0
    for tree in res.scalars().all():
        await ensure_tree_scan_target(db, tree)
        count += 1
    if count:
        await db.commit()
    return count
