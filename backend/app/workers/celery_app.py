"""Celery application factory.

Tasks registered automatically by importing the `tasks` submodule.
Configure via env (CELERY_BROKER_URL, CELERY_RESULT_BACKEND); defaults
mirror the application's Redis URL.
"""

from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "byot",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_default_queue="default",
    task_routes={
        "app.workers.tasks.run_ai_analysis": {"queue": "ai"},
        "app.workers.tasks.run_satellite_scan": {"queue": "satellite"},
        "app.workers.tasks.recalc_carbon": {"queue": "carbon"},
        "app.workers.tasks.send_notification": {"queue": "notifications"},
        "app.workers.tasks.run_bioacoustic_analysis": {"queue": "bioacoustic"},
    },
    beat_schedule={
        "monthly-satellite-scan": {
            "task": "app.workers.tasks.monthly_satellite_sweep",
            "schedule": crontab(day_of_month="1", hour="2", minute="0"),
        },
        "daily-health-roundup": {
            "task": "app.workers.tasks.daily_health_roundup",
            "schedule": crontab(hour="3", minute="0"),
        },
    },
)
