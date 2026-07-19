"""Celery worker and monitoring job health checks."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.monitoring.job_runs import get_recent_job_runs
from app.workers.celery_app import celery_app


def inspect_celery_workers(timeout: float = 2.0) -> dict[str, Any]:
    """Ping Celery workers; returns reachable worker hostnames."""
    try:
        inspect = celery_app.control.inspect(timeout=timeout)
        ping = inspect.ping() if inspect else None
    except Exception as exc:
        return {"reachable": False, "workers": [], "error": str(exc)}
    if not ping:
        return {"reachable": False, "workers": [], "error": "no_workers_responding"}
    return {"reachable": True, "workers": sorted(ping.keys()), "error": None}


async def build_worker_health(db: AsyncSession) -> dict[str, Any]:
    celery = inspect_celery_workers()
    recent = await get_recent_job_runs(db, limit=15)
    failed_recent = [j for j in recent if j.get("status") == "error"]
    status = "ok"
    if not celery["reachable"] or failed_recent:
        status = "degraded"
    return {
        "status": status,
        "celery": celery,
        "recent_jobs": recent,
        "failed_job_count": len(failed_recent),
    }
