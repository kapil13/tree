"""Persist monitoring cron job run metadata."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.monitoring_job_run import MonitoringJobRun


async def record_job_run(
    db: AsyncSession,
    *,
    job_name: str,
    status: str,
    result: dict[str, Any] | None = None,
    error: str | None = None,
) -> None:
    row = MonitoringJobRun(
        job_name=job_name,
        status=status,
        result=result or {},
        error_message=error,
        finished_at=datetime.now(UTC),
    )
    db.add(row)
    await db.commit()


async def get_recent_job_runs(db: AsyncSession, *, limit: int = 10) -> list[dict[str, Any]]:
    res = await db.execute(
        select(MonitoringJobRun)
        .order_by(MonitoringJobRun.finished_at.desc())
        .limit(limit)
    )
    return [
        {
            "job_name": r.job_name,
            "status": r.status,
            "result": r.result,
            "error": r.error_message,
            "finished_at": r.finished_at.isoformat() if r.finished_at else None,
        }
        for r in res.scalars().all()
    ]
