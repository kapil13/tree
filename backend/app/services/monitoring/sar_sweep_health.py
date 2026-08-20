"""SAR sweep outcome tracking and operator alerts — Phase 3.4."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.planting_project import PlantingProject
from app.models.user import User
from app.services.monitoring.alert_engine import create_monitoring_alert
from app.services.monitoring.job_runs import get_recent_job_runs
from app.services.satellite.sar_service import is_sar_provider_record

log = get_logger("monitoring.sar_sweep_health")

STUB_RATIO_ALERT_THRESHOLD = 0.5


def classify_sar_provider(provider: str | None) -> str:
    if not provider:
        return "failed"
    if not is_sar_provider_record(provider):
        return "other"
    if "stub" in provider.lower():
        return "stub"
    return "live"


def summarize_sweep_counts(*, scanned: int, failed: int, stub_scans: int, live_scans: int) -> dict[str, Any]:
    total_attempts = scanned + failed
    stub_ratio = round(stub_scans / scanned, 3) if scanned else 0.0
    return {
        "scanned": scanned,
        "failed": failed,
        "stub_scans": stub_scans,
        "live_scans": live_scans,
        "total_attempts": total_attempts,
        "stub_ratio": stub_ratio,
        "all_stub": scanned > 0 and live_scans == 0 and stub_scans > 0,
        "degraded": scanned > 0 and stub_ratio >= STUB_RATIO_ALERT_THRESHOLD,
    }


async def maybe_alert_sweep_health(
    db: AsyncSession,
    *,
    user: User | None,
    job_name: str,
    outcome: dict[str, Any],
):
    if user is None:
        return None
    if not outcome.get("all_stub") and not outcome.get("degraded"):
        return None
    scanned = int(outcome.get("scanned") or 0)
    stub = int(outcome.get("stub_scans") or 0)
    live = int(outcome.get("live_scans") or 0)
    return await create_monitoring_alert(
        db,
        user=user,
        kind="sar_sweep_health",
        severity="high" if outcome.get("all_stub") else "moderate",
        title=f"SAR sweep used stub data ({job_name})",
        message=(
            f"SAR {job_name} completed with {stub}/{scanned} stub scans and {live} live scans. "
            "Check GEE or Sentinel Hub credentials and worker mounts."
        ),
        payload={
            "job_name": job_name,
            "alert_reason": "sweep_stub_fallback",
            "scanned": scanned,
            "stub_scans": stub,
            "live_scans": live,
            "stub_ratio": outcome.get("stub_ratio"),
        },
        prefs_key="satellite_health",
        dedupe_hours=72,
        dedupe_keys=("job_name", "alert_reason"),
    )


async def evaluate_recent_sar_jobs(db: AsyncSession, user: User) -> dict[str, Any]:
    """Inspect latest SAR Celery job runs and raise alerts when outcomes are degraded."""
    jobs = await get_recent_job_runs(db, limit=30)
    sar_jobs = [j for j in jobs if j.get("job_name") in {"monthly_sar_sweep", "weekly_sar_integrity_watch"}]
    alerts_created = 0
    for job in sar_jobs[:2]:
        if job.get("status") != "ok":
            continue
        result = job.get("result") or {}
        outcome = summarize_sweep_counts(
            scanned=int(result.get("scanned") or 0),
            failed=int(result.get("failed") or 0),
            stub_scans=int(result.get("stub_scans") or 0),
            live_scans=int(result.get("live_scans") or 0),
        )
        if outcome.get("degraded") or outcome.get("all_stub"):
            alert = await maybe_alert_sweep_health(
                db,
                user=user,
                job_name=str(job.get("job_name")),
                outcome=outcome,
            )
            if alert:
                alerts_created += 1
    return {"jobs_reviewed": len(sar_jobs), "alerts_created": alerts_created}


async def notify_project_owners_sweep_health(
    db: AsyncSession,
    *,
    project_ids: set,
    job_name: str,
    outcome: dict[str, Any],
) -> int:
    if not outcome.get("degraded") and not outcome.get("all_stub"):
        return 0
    if not project_ids:
        return 0
    res = await db.execute(
        select(PlantingProject).where(PlantingProject.id.in_(project_ids))
    )
    notified = 0
    for project in res.scalars().all():
        if not project.owner_user_id:
            continue
        owner = await db.get(User, project.owner_user_id)
        if owner is None:
            continue
        alert = await maybe_alert_sweep_health(db, user=owner, job_name=job_name, outcome=outcome)
        if alert is not None:
            notified += 1
    return notified
