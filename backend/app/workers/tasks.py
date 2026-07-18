from __future__ import annotations

import uuid

from app.core.logging import get_logger
from app.workers.celery_app import celery_app

log = get_logger("worker")


@celery_app.task(name="app.workers.tasks.run_bioacoustic_analysis")
def run_bioacoustic_analysis(recording_id: str) -> dict:
    log.info("worker.run_bioacoustic_analysis", recording_id=recording_id)
    from app.services.bioacoustic.ops import analyze_bioacoustic_recording_sync

    return analyze_bioacoustic_recording_sync(uuid.UUID(recording_id))


@celery_app.task(name="app.workers.tasks.run_ai_analysis")
def run_ai_analysis(tree_id: str) -> dict:
    log.info("worker.run_ai_analysis", tree_id=tree_id)
    return {"tree_id": tree_id, "status": "queued"}


@celery_app.task(name="app.workers.tasks.run_satellite_scan")
def run_satellite_scan(tree_id: str) -> dict:
    log.info("worker.run_satellite_scan", tree_id=tree_id)
    return {"tree_id": tree_id, "status": "queued"}


@celery_app.task(name="app.workers.tasks.recalc_carbon")
def recalc_carbon(tree_id: str) -> dict:
    log.info("worker.recalc_carbon", tree_id=tree_id)
    return {"tree_id": tree_id, "status": "queued"}


@celery_app.task(name="app.workers.tasks.send_notification")
def send_notification(user_id: str, channel: str, title: str, message: str) -> dict:
    log.info("worker.send_notification", user_id=user_id, channel=channel)
    return {"user_id": user_id, "status": "sent"}


@celery_app.task(name="app.workers.tasks.monthly_satellite_sweep")
def monthly_satellite_sweep() -> dict:
    log.info("worker.monthly_satellite_sweep")
    return {"status": "completed"}


@celery_app.task(name="app.workers.tasks.daily_health_roundup")
def daily_health_roundup() -> dict:
    log.info("worker.daily_health_roundup")
    return {"status": "completed"}


@celery_app.task(name="app.workers.tasks.survival_survey_reminders")
def survival_survey_reminders() -> dict:
    """Create re-geotagging / survival survey alerts for due projects."""
    log.info("worker.survival_survey_reminders")
    import asyncio

    from app.core.database import AsyncSessionLocal
    from app.services.planting_projects.survival_survey import create_survival_survey_alerts

    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            return await create_survival_survey_alerts(db)

    return asyncio.run(_run())


@celery_app.task(name="app.workers.tasks.threat_watch_scan")
def threat_watch_scan() -> dict:
    """Emit weather, pest, and locust early-warning alerts for plantation sites."""
    log.info("worker.threat_watch_scan")
    import asyncio

    from app.core.database import AsyncSessionLocal
    from app.services.planting_projects.threat_alerts import create_threat_watch_alerts

    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            return await create_threat_watch_alerts(db)

    return asyncio.run(_run())
