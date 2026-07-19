"""Unified monitoring alert creation with deduplication."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.alert import Alert
from app.models.user import User
from app.services.alerts.defaults import (
    DEFAULT_SATELLITE_HEALTH_PREFS,
    DEFAULT_SURVIVAL_SURVEY_PREFS,
    DEFAULT_THREAT_WATCH_PREFS,
    default_notification_preferences,
)
from app.services.alerts.service import dispatch_alert_channels

log = get_logger("monitoring.alerts")

PREFS_MAP = {
    "satellite_health": DEFAULT_SATELLITE_HEALTH_PREFS,
    "threat_watch": DEFAULT_THREAT_WATCH_PREFS,
    "survival_survey": DEFAULT_SURVIVAL_SURVEY_PREFS,
    "monitoring": {"enabled": True, "channels": ["in_app", "email"]},
}


async def recent_alert_exists(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    kind: str,
    payload_match: dict[str, str],
    within_hours: int = 24,
) -> bool:
    since = datetime.now(UTC) - timedelta(hours=within_hours)
    res = await db.execute(
        select(Alert)
        .where(Alert.user_id == user_id, Alert.kind == kind, Alert.created_at >= since)
        .order_by(Alert.created_at.desc())
        .limit(50)
    )
    for alert in res.scalars().all():
        pl = alert.payload or {}
        if all(pl.get(k) == v for k, v in payload_match.items()):
            return True
    return False


def _resolve_channels(user: User, prefs_key: str, severity: str) -> list[str]:
    prefs = user.notification_preferences or default_notification_preferences()
    base = {**PREFS_MAP.get(prefs_key, PREFS_MAP["monitoring"]), **(prefs.get(prefs_key) or {})}
    if not base.get("enabled", True):
        return ["in_app"]
    channels: list[str] = ["in_app"]
    for ch in base.get("channels", ["email"]):
        if ch in ("email", "sms", "push") and ch not in channels:
            channels.append(ch)
    if severity == "critical" and base.get("sms_on_critical") and user.phone and "sms" not in channels:
        channels.append("sms")
    return channels


async def create_monitoring_alert(
    db: AsyncSession,
    *,
    user: User,
    kind: str,
    severity: str,
    title: str,
    message: str,
    payload: dict[str, Any],
    prefs_key: str = "monitoring",
    dedupe_hours: int = 24,
    dedupe_keys: tuple[str, ...] = ("fence_id",),
    channels: list[str] | None = None,
) -> Alert | None:
    match = {k: str(payload[k]) for k in dedupe_keys if payload.get(k) is not None}
    if match and await recent_alert_exists(
        db, user_id=user.id, kind=kind, payload_match=match, within_hours=dedupe_hours
    ):
        return None

    resolved = channels or _resolve_channels(user, prefs_key, severity)
    alert = Alert(
        user_id=user.id,
        tree_id=uuid.UUID(payload["tree_id"]) if payload.get("tree_id") else None,
        kind=kind,
        severity=severity,
        title=title,
        message=message[:4000],
        channels=resolved,
        delivered={},
        payload=payload,
    )
    db.add(alert)
    await db.flush()
    alert.delivered = await dispatch_alert_channels(user, resolved, title=title, message=message)
    log.info("monitoring.alert_created", kind=kind, user_id=str(user.id))
    return alert
