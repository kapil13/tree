"""Unified scan cycle timeline — scheduled jobs, recent runs, and registry due counts."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.monitoring_job_run import MonitoringJobRun
from app.models.monitoring_scan_target import MonitoringScanTarget
from app.services.data_scope import apply_owner_org_scope
from app.services.monitoring.job_runs import get_recent_job_runs
from app.services.monitoring.scan_ops import build_scan_engine_summary

SCAN_CYCLE_JOB_NAMES = (
    "daily_tree_scan_sweep",
    "daily_satellite_watch_sweep",
    "weekly_tree_scan_target_backfill",
    "threat_watch_scan",
    "monthly_satellite_sweep",
    "monthly_sar_sweep",
    "weekly_sar_integrity_watch",
    "daily_sar_sweep_health",
    "daily_satellite_health_digest",
)

SCAN_CYCLE_SCHEDULE: dict[str, dict[str, Any]] = {
    "daily_tree_scan_sweep": {
        "label": "Tree NDVI sweep",
        "cadence": "daily",
        "schedule_utc": "02:30",
    },
    "daily_satellite_watch_sweep": {
        "label": "Work-area watch sweep",
        "cadence": "daily",
        "schedule_utc": "02:45",
    },
    "weekly_tree_scan_target_backfill": {
        "label": "Tree scan registry backfill",
        "cadence": "weekly",
        "schedule_utc": "Sun 01:30",
    },
    "threat_watch_scan": {
        "label": "Fire & flood hazard watch",
        "cadence": "daily",
        "schedule_utc": "05:30",
    },
    "monthly_satellite_sweep": {
        "label": "Monthly plantation NDVI",
        "cadence": "monthly",
        "schedule_utc": "1st 02:00",
    },
    "monthly_sar_sweep": {
        "label": "Monthly SAR sweep",
        "cadence": "monthly",
        "schedule_utc": "5th 03:00",
    },
    "weekly_sar_integrity_watch": {
        "label": "Weekly SAR integrity watch",
        "cadence": "weekly",
        "schedule_utc": "Mon 04:00",
    },
    "daily_sar_sweep_health": {
        "label": "SAR sweep health check",
        "cadence": "daily",
        "schedule_utc": "04:30",
    },
    "daily_satellite_health_digest": {
        "label": "Daily satellite health digest",
        "cadence": "daily",
        "schedule_utc": "06:30",
    },
    "weekly_scan_cycle_digest": {
        "label": "Weekly scan cycle digest",
        "cadence": "weekly",
        "schedule_utc": "Mon 07:00",
    },
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


async def _latest_runs_by_job(db: AsyncSession) -> dict[str, MonitoringJobRun]:
    out: dict[str, MonitoringJobRun] = {}
    for job_name in SCAN_CYCLE_JOB_NAMES:
        run = (
            await db.execute(
                select(MonitoringJobRun)
                .where(MonitoringJobRun.job_name == job_name)
                .order_by(MonitoringJobRun.finished_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if run is not None:
            out[job_name] = run
    return out


def _stale_flag(last_run: MonitoringJobRun | None, cadence: str) -> bool:
    if last_run is None or last_run.finished_at is None:
        return True
    age = datetime.now(UTC) - last_run.finished_at
    thresholds = {
        "daily": timedelta(hours=36),
        "weekly": timedelta(days=9),
        "monthly": timedelta(days=35),
    }
    return age > thresholds.get(cadence, timedelta(days=2))


async def build_scan_cycle(db: AsyncSession, user) -> dict[str, Any]:
    """Portfolio scan cycle timeline for supervisors."""
    registry = await build_scan_engine_summary(db, user)
    latest = await _latest_runs_by_job(db)

    jobs: list[dict[str, Any]] = []
    for job_name, meta in SCAN_CYCLE_SCHEDULE.items():
        last = latest.get(job_name)
        jobs.append(
            {
                "job_name": job_name,
                "label": meta["label"],
                "cadence": meta["cadence"],
                "schedule_utc": meta["schedule_utc"],
                "last_run": _job_snapshot(last),
                "stale": _stale_flag(last, meta["cadence"]),
            }
        )

    recent = [
        j
        for j in await get_recent_job_runs(db, limit=30)
        if j.get("job_name") in SCAN_CYCLE_JOB_NAMES
    ][:15]

    now = datetime.now(UTC)
    due_stmt = apply_owner_org_scope(
        select(func.count(MonitoringScanTarget.id)),
        user,
        owner_col=MonitoringScanTarget.owner_user_id,
        org_col=MonitoringScanTarget.organization_id,
    ).where(
        MonitoringScanTarget.next_due_at.isnot(None),
        MonitoringScanTarget.next_due_at <= now + timedelta(days=7),
    )
    due_week = int((await db.execute(due_stmt)).scalar_one() or 0)

    return {
        "generated_at": now.isoformat(),
        "registry": registry,
        "due_within_7_days": due_week,
        "scheduled_jobs": jobs,
        "recent_runs": recent,
    }
