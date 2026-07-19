from __future__ import annotations

import uuid

from app.core.logging import get_logger
from app.workers.celery_app import celery_app

log = get_logger("worker")


def _run_async(coro):
    import asyncio

    return asyncio.run(coro)


async def _record(job_name: str, status: str, result=None, error=None):
    from app.core.database import AsyncSessionLocal
    from app.services.monitoring.job_runs import record_job_run

    async with AsyncSessionLocal() as db:
        await record_job_run(db, job_name=job_name, status=status, result=result, error=error)


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

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.models.tree import Tree
        from app.services.monitoring.satellite_sweep import scan_and_persist_tree
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            tree = (
                await db.execute(select(Tree).where(Tree.id == uuid.UUID(tree_id)))
            ).scalar_one_or_none()
            if tree is None:
                return {"status": "not_found", "tree_id": tree_id}
            rec = await scan_and_persist_tree(db, tree)
            await db.commit()
            return {
                "tree_id": tree_id,
                "status": "ok" if rec else "failed",
                "ndvi_mean": float(rec.ndvi_mean) if rec and rec.ndvi_mean else None,
            }

    try:
        result = _run_async(_run())
        _run_async(_record("run_satellite_scan", "ok", result))
        return result
    except Exception as exc:
        _run_async(_record("run_satellite_scan", "error", error=str(exc)))
        raise


@celery_app.task(name="app.workers.tasks.recalc_carbon")
def recalc_carbon(tree_id: str) -> dict:
    log.info("worker.recalc_carbon", tree_id=tree_id)
    return {"tree_id": tree_id, "status": "queued"}


@celery_app.task(name="app.workers.tasks.send_notification")
def send_notification(user_id: str, channel: str, title: str, message: str) -> dict:
    """Async dispatch for email/SMS (decoupled from request path)."""
    log.info("worker.send_notification", user_id=user_id, channel=channel)

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.models.user import User
        from app.services.alerts.service import dispatch_alert_channels

        async with AsyncSessionLocal() as db:
            user = await db.get(User, uuid.UUID(user_id))
            if user is None:
                return {"status": "user_not_found"}
            delivered = await dispatch_alert_channels(user, [channel], title=title, message=message)
            return {"status": "ok", "delivered": delivered}

    return _run_async(_run())


@celery_app.task(name="app.workers.tasks.monthly_satellite_sweep")
def monthly_satellite_sweep() -> dict:
    log.info("worker.monthly_satellite_sweep")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.monitoring.satellite_sweep import run_monthly_satellite_sweep

        async with AsyncSessionLocal() as db:
            return await run_monthly_satellite_sweep(db)

    try:
        result = _run_async(_run())
        _run_async(_record("monthly_satellite_sweep", "ok", result))
        return result
    except Exception as exc:
        _run_async(_record("monthly_satellite_sweep", "error", error=str(exc)))
        raise


@celery_app.task(name="app.workers.tasks.daily_health_roundup")
def daily_health_roundup() -> dict:
    log.info("worker.daily_health_roundup")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.monitoring.compliance_escalation import create_compliance_escalation_alerts
        from app.services.monitoring.health_roundup import run_daily_health_roundup

        async with AsyncSessionLocal() as db:
            health = await run_daily_health_roundup(db)
            compliance = await create_compliance_escalation_alerts(db)
            return {"health": health, "compliance": compliance}

    try:
        result = _run_async(_run())
        _run_async(_record("daily_health_roundup", "ok", result))
        return result
    except Exception as exc:
        _run_async(_record("daily_health_roundup", "error", error=str(exc)))
        raise


@celery_app.task(name="app.workers.tasks.survival_survey_reminders")
def survival_survey_reminders() -> dict:
    log.info("worker.survival_survey_reminders")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.planting_projects.survival_survey import create_survival_survey_alerts

        async with AsyncSessionLocal() as db:
            return await create_survival_survey_alerts(db)

    try:
        result = _run_async(_run())
        _run_async(_record("survival_survey_reminders", "ok", result))
        return result
    except Exception as exc:
        _run_async(_record("survival_survey_reminders", "error", error=str(exc)))
        raise


@celery_app.task(name="app.workers.tasks.threat_watch_scan")
def threat_watch_scan() -> dict:
    log.info("worker.threat_watch_scan")

    async def _run() -> dict:
        from app.core.database import AsyncSessionLocal
        from app.services.planting_projects.threat_alerts import create_threat_watch_alerts

        async with AsyncSessionLocal() as db:
            return await create_threat_watch_alerts(db)

    try:
        result = _run_async(_run())
        _run_async(_record("threat_watch_scan", "ok", result))
        return result
    except Exception as exc:
        _run_async(_record("threat_watch_scan", "error", error=str(exc)))
        raise
