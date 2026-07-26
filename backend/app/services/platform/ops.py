"""Platform operations admin — workers, integrations, and job runs."""

from __future__ import annotations

from collections import Counter
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.monitoring_job_run import MonitoringJobRun
from app.services.intelligence.integrations import build_integrations_health
from app.services.monitoring.job_runs import get_recent_job_runs
from app.services.monitoring.worker_health import build_worker_health


async def build_ops_summary(db: AsyncSession) -> dict[str, Any]:
    workers = await build_worker_health(db)
    integrations = await build_integrations_health(ping_remote=False)
    recent_jobs = await get_recent_job_runs(db, limit=25)
    status_counts = Counter(j.get("status") for j in recent_jobs)
    job_name_counts = Counter(j.get("job_name") for j in recent_jobs)
    total_runs = int(
        (await db.execute(select(func.count()).select_from(MonitoringJobRun))).scalar_one()
    )

    overall = "ok"
    if workers.get("status") != "ok" or integrations.get("status") not in {"ok", "degraded"}:
        overall = "degraded"
    if workers.get("status") == "degraded" and integrations.get("status") == "error":
        overall = "error"

    return {
        "status": overall,
        "workers": workers,
        "integrations": integrations,
        "jobs": {
            "total_recorded": total_runs,
            "recent_count": len(recent_jobs),
            "recent_by_status": dict(status_counts),
            "recent_by_name": dict(job_name_counts),
            "recent": recent_jobs,
        },
    }
