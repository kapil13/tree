"""Platform operations admin — workers, integrations, webhooks, and jobs."""

from __future__ import annotations

import uuid
from collections import Counter
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.monitoring_job_run import MonitoringJobRun
from app.models.organization import Organization
from app.models.payment import PaymentEvent
from app.models.webhook import OrganizationWebhook, WebhookDelivery
from app.services.intelligence.integrations import build_integrations_health
from app.services.monitoring.job_runs import get_recent_job_runs
from app.services.monitoring.worker_health import build_worker_health
from app.services.webhooks.dispatcher import deliver_webhook_once

RETRYABLE_JOBS: dict[str, str] = {
    "daily_health_roundup": "daily_health_roundup",
    "monthly_satellite_sweep": "monthly_satellite_sweep",
    "daily_satellite_health_digest": "daily_satellite_health_digest",
    "threat_watch_scan": "threat_watch_scan",
    "compliance_deadline_scan": "compliance_deadline_scan",
    "survival_survey_reminders": "survival_survey_reminders",
    "biodiversity_baseline": "biodiversity_baseline",
    "daily_tree_scan_sweep": "daily_tree_scan_sweep",
    "daily_satellite_watch_sweep": "daily_satellite_watch_sweep",
    "weekly_tree_scan_target_backfill": "weekly_tree_scan_target_backfill",
}


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


async def ping_integrations(db: AsyncSession) -> dict[str, Any]:
    return await build_integrations_health(ping_remote=True)


async def query_failed_webhook_deliveries(
    db: AsyncSession,
    *,
    limit: int = 50,
) -> list[dict[str, Any]]:
    limit = min(max(limit, 1), 100)
    rows = (
        await db.execute(
            select(WebhookDelivery, OrganizationWebhook, Organization.name)
            .join(OrganizationWebhook, OrganizationWebhook.id == WebhookDelivery.webhook_id)
            .join(Organization, Organization.id == OrganizationWebhook.organization_id)
            .where(WebhookDelivery.status == "failed")
            .order_by(WebhookDelivery.created_at.desc())
            .limit(limit)
        )
    ).all()
    return [
        {
            "id": delivery.id,
            "event_type": delivery.event_type,
            "status": delivery.status,
            "attempt_count": delivery.attempt_count,
            "error_message": delivery.error_message,
            "response_status": delivery.response_status,
            "created_at": delivery.created_at,
            "webhook_id": webhook.id,
            "webhook_label": webhook.label,
            "webhook_url": webhook.url,
            "organization_id": webhook.organization_id,
            "organization_name": org_name,
        }
        for delivery, webhook, org_name in rows
    ]


async def retry_webhook_delivery(db: AsyncSession, delivery_id: uuid.UUID) -> dict[str, Any]:
    delivery = await deliver_webhook_once(db, delivery_id)
    await db.commit()
    return {
        "id": delivery.id,
        "status": delivery.status,
        "attempt_count": delivery.attempt_count,
        "error_message": delivery.error_message,
    }


async def query_payment_events(
    db: AsyncSession,
    *,
    event_type: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    limit = min(max(limit, 1), 100)
    stmt = select(PaymentEvent).order_by(PaymentEvent.created_at.desc()).limit(limit)
    if event_type:
        stmt = stmt.where(PaymentEvent.event_type.ilike(f"%{event_type}%"))
    else:
        stmt = stmt.where(PaymentEvent.event_type.ilike("%failed%"))
    rows = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": str(row.id),
            "event_id": row.event_id,
            "event_type": row.event_type,
            "provider": row.provider,
            "created_at": row.created_at,
            "payload_preview": str(row.payload)[:500],
        }
        for row in rows
    ]


async def retry_monitoring_job(db: AsyncSession, run_id: uuid.UUID) -> dict[str, Any]:
    run = await db.get(MonitoringJobRun, run_id)
    if run is None:
        raise ValueError("job_run_not_found")
    if run.job_name not in RETRYABLE_JOBS:
        raise ValueError("job_not_retryable")
    task_name = RETRYABLE_JOBS[run.job_name]
    task_id = _enqueue_job(task_name)
    return {"job_name": run.job_name, "celery_task_id": task_id, "status": "queued"}


async def trigger_monitoring_job(db: AsyncSession, job_name: str) -> dict[str, Any]:
    if job_name not in RETRYABLE_JOBS:
        raise ValueError("job_not_allowed")
    task_id = _enqueue_job(RETRYABLE_JOBS[job_name])
    return {"job_name": job_name, "celery_task_id": task_id, "status": "queued"}


def _enqueue_job(task_name: str) -> str | None:
    from app.workers import tasks as worker_tasks

    task = getattr(worker_tasks, task_name, None)
    if task is None:
        raise ValueError("job_not_allowed")
    try:
        async_result = task.delay()
        return async_result.id
    except Exception as exc:
        raise ValueError("celery_unavailable") from exc
