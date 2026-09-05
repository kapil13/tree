"""Scan engine operations summary — registry, quotas, and recent sweep telemetry."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.monitoring_job_run import MonitoringJobRun
from app.models.monitoring_scan_target import MonitoringScanTarget
from app.services.data_scope import apply_owner_org_scope
from app.services.threats.firms_client import has_firms_credentials


def _count_stmt(user):
    return apply_owner_org_scope(
        select(func.count(MonitoringScanTarget.id)),
        user,
        owner_col=MonitoringScanTarget.owner_user_id,
        org_col=MonitoringScanTarget.organization_id,
    )


async def build_scan_engine_summary(db: AsyncSession, user) -> dict[str, Any]:
    """Portfolio scan registry stats for supervisors."""
    now = datetime.now(UTC)

    total_targets = int((await db.execute(_count_stmt(user))).scalar_one() or 0)
    tree_count = int(
        (
            await db.execute(
                _count_stmt(user).where(MonitoringScanTarget.target_type == "tree")
            )
        ).scalar_one()
        or 0
    )
    watch_work_areas = int(
        (
            await db.execute(
                _count_stmt(user).where(
                    MonitoringScanTarget.target_type == "work_area",
                    MonitoringScanTarget.watch_enabled.is_(True),
                )
            )
        ).scalar_one()
        or 0
    )
    due_now = int(
        (
            await db.execute(
                _count_stmt(user).where(
                    MonitoringScanTarget.next_due_at.isnot(None),
                    MonitoringScanTarget.next_due_at <= now,
                )
            )
        ).scalar_one()
        or 0
    )

    tile_stmt = apply_owner_org_scope(
        select(MonitoringScanTarget.scan_tile),
        user,
        owner_col=MonitoringScanTarget.owner_user_id,
        org_col=MonitoringScanTarget.organization_id,
    ).where(
        MonitoringScanTarget.target_type == "tree",
        MonitoringScanTarget.scan_tile.isnot(None),
    )
    tile_res = await db.execute(tile_stmt.distinct())
    distinct_tiles = len(tile_res.all())

    last_tree_sweep = (
        await db.execute(
            select(MonitoringJobRun)
            .where(MonitoringJobRun.job_name == "daily_tree_scan_sweep")
            .order_by(MonitoringJobRun.finished_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    last_watch_sweep = (
        await db.execute(
            select(MonitoringJobRun)
            .where(MonitoringJobRun.job_name == "daily_satellite_watch_sweep")
            .order_by(MonitoringJobRun.finished_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    return {
        "enrolled_targets": total_targets,
        "enrolled_trees": tree_count,
        "watch_work_areas": watch_work_areas,
        "due_now": due_now,
        "distinct_scan_tiles": distinct_tiles,
        "tile_batching_enabled": settings.monitoring_tile_batch_enabled,
        "org_daily_scan_limit": settings.monitoring_org_daily_scan_limit,
        "tree_batch_limit": settings.monitoring_tree_scan_batch_limit,
        "firms_live": has_firms_credentials(),
        "last_tree_sweep": _job_snapshot(last_tree_sweep),
        "last_watch_sweep": _job_snapshot(last_watch_sweep),
    }


def _job_snapshot(run: MonitoringJobRun | None) -> dict[str, Any] | None:
    if run is None:
        return None
    return {
        "status": run.status,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "result": run.result or {},
        "error": run.error_message,
    }
