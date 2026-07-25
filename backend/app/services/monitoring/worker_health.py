"""Celery worker and monitoring job health checks."""

from __future__ import annotations

import shutil
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.bioacoustic.birdnet_runner import birdnet_available
from app.services.bioacoustic.identification_coverage import identification_coverage
from app.services.bioacoustic.perch_runner import perch_available
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


def build_bioacoustic_health() -> dict[str, Any]:
    """Report ML pipeline readiness for VPS operations."""
    coverage = identification_coverage()
    return {
        "pipeline": settings.bioacoustic_pipeline,
        "perch_enabled": settings.bioacoustic_enable_perch,
        "birdnet_available": birdnet_available(),
        "perch_available": perch_available(),
        "ffmpeg_available": shutil.which("ffmpeg") is not None,
        "perch_model_path": settings.bioacoustic_perch_model_path,
        "perch_labels_path": settings.bioacoustic_perch_labels_path,
        "taxon_coverage": coverage,
        "production_ready": (
            settings.bioacoustic_pipeline == "stub"
            or birdnet_available()
            or (settings.bioacoustic_enable_perch and perch_available())
        ),
    }


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
        "bioacoustic": build_bioacoustic_health(),
        "recent_jobs": recent,
        "failed_job_count": len(failed_recent),
    }
