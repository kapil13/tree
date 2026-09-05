"""Celery application factory.

Tasks registered automatically by importing the `tasks` submodule.
Configure via env (CELERY_BROKER_URL, CELERY_RESULT_BACKEND); defaults
mirror the application's Redis URL.
"""

from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings
from app.workers import async_runner as _async_runner  # noqa: F401

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
        "app.workers.tasks.run_sar_scan": {"queue": "satellite"},
        "app.workers.tasks.monthly_sar_sweep": {"queue": "satellite"},
        "app.workers.tasks.weekly_sar_integrity_watch": {"queue": "satellite"},
        "app.workers.tasks.daily_sar_sweep_health": {"queue": "satellite"},
        "app.workers.tasks.recalc_carbon": {"queue": "carbon"},
        "app.workers.tasks.refresh_project_integrity_fusion": {"queue": "carbon"},
        "app.workers.tasks.backfill_integrity_fusion": {"queue": "carbon"},
        "app.workers.tasks.send_notification": {"queue": "notifications"},
        "app.workers.tasks.deliver_webhook": {"queue": "notifications"},
        "app.workers.tasks.run_bioacoustic_analysis": {"queue": "bioacoustic"},
    },
    beat_schedule={
        "monthly-satellite-scan": {
            "task": "app.workers.tasks.monthly_satellite_sweep",
            "schedule": crontab(day_of_month="1", hour="2", minute="0"),
        },
        "monthly-sar-sweep": {
            "task": "app.workers.tasks.monthly_sar_sweep",
            "schedule": crontab(day_of_month="5", hour="3", minute="0"),
        },
        "weekly-sar-integrity-watch": {
            "task": "app.workers.tasks.weekly_sar_integrity_watch",
            "schedule": crontab(day_of_week="1", hour="4", minute="0"),
        },
        "daily-sar-sweep-health": {
            "task": "app.workers.tasks.daily_sar_sweep_health",
            "schedule": crontab(hour="4", minute="30"),
        },
        "daily-health-roundup": {
            "task": "app.workers.tasks.daily_health_roundup",
            "schedule": crontab(hour="3", minute="0"),
        },
        "survival-survey-reminders": {
            "task": "app.workers.tasks.survival_survey_reminders",
            "schedule": crontab(hour="6", minute="0"),
        },
        "citizen-stewardship-reminders": {
            "task": "app.workers.tasks.citizen_stewardship_reminders",
            "schedule": crontab(hour="6", minute="15"),
        },
        "threat-watch-scan": {
            "task": "app.workers.tasks.threat_watch_scan",
            "schedule": crontab(hour="5", minute="30"),
        },
        "daily-satellite-health-digest": {
            "task": "app.workers.tasks.daily_satellite_health_digest",
            "schedule": crontab(hour="6", minute="30"),
        },
        "compliance-deadline-scan": {
            "task": "app.workers.tasks.compliance_deadline_scan",
            "schedule": crontab(hour="7", minute="0"),
        },
        "biodiversity-baseline": {
            "task": "app.workers.tasks.biodiversity_baseline",
            "schedule": crontab(hour="4", minute="30", day_of_week="0"),
        },
        "daily-audit-root-publish": {
            "task": "app.workers.tasks.publish_daily_audit_root",
            "schedule": crontab(hour="0", minute="5"),
        },
        "nightly-integrity-fusion-backfill": {
            "task": "app.workers.tasks.backfill_integrity_fusion",
            "schedule": crontab(hour="3", minute="45"),
            "kwargs": {"limit_projects": 50},
        },
        "daily-tree-scan-sweep": {
            "task": "app.workers.tasks.daily_tree_scan_sweep",
            "schedule": crontab(hour="2", minute="30"),
        },
        "daily-satellite-watch-sweep": {
            "task": "app.workers.tasks.daily_satellite_watch_sweep",
            "schedule": crontab(hour="2", minute="45"),
        },
        "weekly-tree-scan-backfill": {
            "task": "app.workers.tasks.weekly_tree_scan_target_backfill",
            "schedule": crontab(day_of_week="0", hour="1", minute="30"),
        },
        "weekly-scan-cycle-digest": {
            "task": "app.workers.tasks.weekly_scan_cycle_digest",
            "schedule": crontab(day_of_week="1", hour="7", minute="0"),
        },
    },
)
