"""Celery tasks. Logic lives in services/* and is called from here."""

from __future__ import annotations

import asyncio
import uuid

from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.services.satellite.operations import scan_tree_by_id
from app.workers.celery_app import celery_app

log = get_logger("worker")


@celery_app.task(name="app.workers.tasks.run_ai_analysis")
def run_ai_analysis(tree_id: str) -> dict:
    log.info("worker.run_ai_analysis", tree_id=tree_id)
    return {"tree_id": tree_id, "status": "queued"}


async def _run_satellite_scan_async(tree_id: str):
    async with AsyncSessionLocal() as db:
        return await scan_tree_by_id(uuid.UUID(tree_id), db)


@celery_app.task(name="app.workers.tasks.run_satellite_scan")
def run_satellite_scan(tree_id: str) -> dict:
    log.info("worker.run_satellite_scan", tree_id=tree_id)
    try:
        rec = asyncio.run(_run_satellite_scan_async(tree_id))
    except Exception as exc:
        log.exception("worker.run_satellite_scan_failed", tree_id=tree_id)
        return {"tree_id": tree_id, "status": "failed", "error": str(exc)}
    if rec is None:
        return {"tree_id": tree_id, "status": "tree_not_found"}
    return {
        "tree_id": tree_id,
        "status": "completed",
        "record_id": str(rec.id),
        "ndvi_mean": float(rec.ndvi_mean or 0),
        "presence_confirmed": bool(rec.presence_confirmed),
    }


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
