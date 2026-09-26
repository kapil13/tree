"""Maintain monitoring_scan_targets registry for scheduled sweeps."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from geoalchemy2.shape import to_shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.monitoring_scan_target import MonitoringScanTarget
from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.monitoring.mgrs import tree_to_scan_tile
from app.services.monitoring.scan_policy import (
    tree_scan_policy,
    work_area_scan_policy,
)
from app.services.schemes.monitoring import is_satellite_watch_enabled

log = get_logger("monitoring.scan_targets")


def _next_due(interval_days: int, from_time: datetime | None = None) -> datetime:
    base = from_time or datetime.now(UTC)
    return base + timedelta(days=interval_days)


async def ensure_tree_scan_target(db: AsyncSession, tree: Tree) -> MonitoringScanTarget:
    program_code = tree.planting_program.code if tree.planting_program else None
    if program_code is None and tree.program_id:
        from app.models.planting_program import PlantingProgram

        prog = await db.get(PlantingProgram, tree.program_id)
        program_code = prog.code if prog else None

    policy = tree_scan_policy(program_code)
    try:
        pt = to_shape(tree.location)
        scan_tile = tree_to_scan_tile(pt.y, pt.x)
    except Exception:
        scan_tile = None

    res = await db.execute(
        select(MonitoringScanTarget).where(MonitoringScanTarget.tree_id == tree.id)
    )
    row = res.scalar_one_or_none()
    if row is None:
        row = MonitoringScanTarget(
            target_type="tree",
            tree_id=tree.id,
            organization_id=tree.organization_id,
            owner_user_id=tree.owner_user_id,
            program_code=policy.program_code,
            scan_tier=policy.tier,
            scan_tile=scan_tile,
            interval_days=policy.interval_days,
            watch_enabled=False,
            next_due_at=_next_due(policy.interval_days),
        )
        db.add(row)
    else:
        row.organization_id = tree.organization_id
        row.owner_user_id = tree.owner_user_id
        row.program_code = policy.program_code
        row.scan_tier = policy.tier
        row.scan_tile = scan_tile
        row.interval_days = policy.interval_days
        if row.next_due_at is None:
            row.next_due_at = _next_due(policy.interval_days)
    await db.flush()
    return row


async def ensure_work_area_scan_target(
    db: AsyncSession,
    fence: PlantationFence,
    project: PlantingProject | None,
) -> MonitoringScanTarget | None:
    scheme_code = project.scheme_code if project else None
    watch = bool(project and is_satellite_watch_enabled(project))
    policy = work_area_scan_policy(scheme_code, watch_enabled=watch)
    if policy is None:
        res = await db.execute(
            select(MonitoringScanTarget).where(MonitoringScanTarget.fence_id == fence.id)
        )
        existing = res.scalar_one_or_none()
        if existing:
            existing.watch_enabled = False
            await db.flush()
        return None

    try:
        from app.services.geo import geography_to_geojson_polygon, polygon_centroid

        boundary = geography_to_geojson_polygon(fence.boundary)
        lat, lon = polygon_centroid(boundary)
        scan_tile = tree_to_scan_tile(lat, lon)
    except Exception:
        scan_tile = None

    res = await db.execute(
        select(MonitoringScanTarget).where(MonitoringScanTarget.fence_id == fence.id)
    )
    row = res.scalar_one_or_none()
    if row is None:
        row = MonitoringScanTarget(
            target_type="work_area",
            fence_id=fence.id,
            organization_id=fence.organization_id,
            owner_user_id=fence.owner_user_id,
            scheme_code=scheme_code,
            scan_tier=policy.tier,
            scan_tile=scan_tile,
            interval_days=policy.interval_days,
            watch_enabled=True,
            next_due_at=_next_due(policy.interval_days),
        )
        db.add(row)
    else:
        row.watch_enabled = True
        row.scheme_code = scheme_code
        row.scan_tier = policy.tier
        row.scan_tile = scan_tile
        row.interval_days = policy.interval_days
        if row.next_due_at is None:
            row.next_due_at = _next_due(policy.interval_days)
    await db.flush()
    return row


async def mark_target_scanned(
    db: AsyncSession,
    target: MonitoringScanTarget,
    *,
    at: datetime | None = None,
) -> None:
    now = at or datetime.now(UTC)
    target.last_scan_at = now
    target.next_due_at = now + timedelta(days=target.interval_days)
    await db.flush()


async def sync_work_area_targets_for_project(
    db: AsyncSession, project: PlantingProject
) -> int:
    res = await db.execute(
        select(PlantationFence).where(PlantationFence.project_id == project.id)
    )
    count = 0
    for fence in res.scalars().all():
        row = await ensure_work_area_scan_target(db, fence, project)
        if row:
            count += 1
    return count


async def backfill_tree_scan_targets(
    db: AsyncSession, *, limit: int = 500
) -> dict[str, int]:
    res = await db.execute(
        select(Tree)
        .where(Tree.status != "removed")
        .order_by(Tree.created_at.desc())
        .limit(limit)
    )
    created = 0
    for tree in res.scalars().all():
        await db.refresh(tree, attribute_names=["planting_program"])
        before = await db.execute(
            select(MonitoringScanTarget.id).where(MonitoringScanTarget.tree_id == tree.id)
        )
        existed = before.scalar_one_or_none() is not None
        await ensure_tree_scan_target(db, tree)
        if not existed:
            created += 1
    await db.commit()
    return {"processed": limit, "new_targets": created}
