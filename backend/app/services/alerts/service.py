"""Create and dispatch alerts (in-app + email/SMS)."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.alert import Alert
from app.models.user import User
from app.services.ai.satellite_health_types import SatelliteHealthResult
from app.services.alerts.defaults import (
    DEFAULT_SATELLITE_HEALTH_PREFS,
    DEFAULT_THREAT_WATCH_PREFS,
    default_notification_preferences,
)
from app.services.notifications.notifier import Channel, get_notifier

log = get_logger("alerts")

RISK_ORDER = {"low": 0, "moderate": 1, "high": 2, "critical": 3}
URGENT_EMAIL_SEVERITIES = frozenset({"critical", "high", "warning"})
URGENT_EMAIL_RISK_LEVELS = frozenset({"high", "critical"})


def ensure_urgent_email_channel(
    channels: list[str],
    user: User,
    *,
    severity: str | None = None,
    risk_level: str | None = None,
) -> list[str]:
    """Always include email for urgent alerts when the user has an address."""
    urgent = (
        (severity is not None and severity in URGENT_EMAIL_SEVERITIES)
        or (risk_level is not None and risk_level in URGENT_EMAIL_RISK_LEVELS)
    )
    if not urgent or not user.email:
        return channels
    if "email" in channels:
        return channels
    return [*channels, "email"]


def satellite_health_prefs(user: User) -> dict[str, Any]:
    prefs = user.notification_preferences or default_notification_preferences()
    sh = prefs.get("satellite_health") or {}
    return {**DEFAULT_SATELLITE_HEALTH_PREFS, **sh}


def resolve_channels(user: User, risk_level: str) -> list[Channel]:
    sh = satellite_health_prefs(user)
    channels: list[Channel] = ["in_app"]
    if sh.get("enabled", True):
        for ch in sh.get("channels", ["email"]):
            if ch in ("email", "sms", "push") and ch not in channels:
                channels.append(ch)  # type: ignore[arg-type]

        if (
            risk_level == "critical"
            and sh.get("sms_on_critical", True)
            and user.phone
            and "sms" not in channels
        ):
            channels.append("sms")

    return ensure_urgent_email_channel(channels, user, risk_level=risk_level)


def threat_watch_prefs(user: User) -> dict[str, Any]:
    prefs = user.notification_preferences or default_notification_preferences()
    tw = prefs.get("threat_watch") or {}
    return {**DEFAULT_THREAT_WATCH_PREFS, **tw}


async def dispatch_notification_channel_inline(
    db: AsyncSession | None,
    user: User,
    channel: str,
    *,
    title: str,
    message: str,
    push_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Deliver one external notification channel without re-queueing through Celery."""
    if channel == "in_app":
        return {"delivered": True}
    if channel == "push":
        return await _dispatch_push_inline(
            db,
            user,
            title=title,
            message=message,
            push_data=push_data,
        )

    to = user.email if channel == "email" else user.phone if channel == "sms" else ""
    if not to:
        return {"delivered": False, "info": "no_destination"}

    notifier = get_notifier()
    try:
        nr = await notifier.send(channel=channel, to=to, title=title, message=message)  # type: ignore[arg-type]
        return {"delivered": nr.delivered, "info": nr.info}
    except Exception as exc:
        log.warning("alert.dispatch_failed", channel=channel, error=str(exc))
        return {"delivered": False, "info": str(exc)}


async def dispatch_alert_channels(
    user: User,
    channels: list[str],
    *,
    title: str,
    message: str,
    push_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Send alert through configured channels; external channels may be Celery-queued."""
    from app.services.workers.enqueue import try_enqueue
    from app.workers.tasks import send_notification

    delivered: dict[str, Any] = {}

    for channel in channels:
        if channel == "in_app":
            delivered["in_app"] = {"delivered": True}
            continue

        task_id = try_enqueue(
            send_notification,
            str(user.id),
            channel,
            title,
            message,
            push_data or {},
        )
        if task_id:
            delivered[channel] = {"delivered": True, "queued": True, "task_id": task_id}
            continue

        delivered[channel] = await dispatch_notification_channel_inline(
            None,
            user,
            channel,
            title=title,
            message=message,
            push_data=push_data,
        )
    return delivered


async def _dispatch_push_inline(
    db: AsyncSession | None,
    user: User,
    *,
    title: str,
    message: str,
    push_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal
    from app.models.user_device import UserDevice
    from app.services.notifications.push import send_fcm_push

    async def _send(session: AsyncSession) -> dict[str, Any]:
        res = await session.execute(select(UserDevice).where(UserDevice.user_id == user.id))
        devices = list(res.scalars().all())
        if not devices:
            return {"delivered": False, "info": "no_devices"}
        sent = 0
        errors: list[str] = []
        for device in devices:
            result = await send_fcm_push(
                push_token=device.push_token,
                title=title,
                body=message,
                data=push_data,
            )
            if result.delivered:
                sent += 1
            elif result.info:
                errors.append(result.info)
        if sent:
            return {"delivered": True, "devices": sent, "errors": errors[:3] or None}
        return {"delivered": False, "info": errors[0] if errors else "push_failed"}

    if db is not None:
        return await _send(db)
    async with AsyncSessionLocal() as session:
        return await _send(session)


def should_alert_satellite_health(
    result: SatelliteHealthResult,
    prior_risk: str | None,
) -> bool:
    if result.risk_level not in ("high", "critical"):
        return False
    if prior_risk is None:
        return True
    return RISK_ORDER.get(result.risk_level, 0) > RISK_ORDER.get(prior_risk, 0)


def _alert_severity(risk_level: str) -> str:
    return "critical" if risk_level == "critical" else "warning"


def _alert_title(result: SatelliteHealthResult, *, target_label: str) -> str:
    if result.risk_level == "critical":
        return f"Critical satellite health — {target_label}"
    return f"High NDVI risk — {target_label}"


def _alert_message(result: SatelliteHealthResult) -> str:
    parts = [result.summary]
    urgent = [t.action for t in result.treatments if t.priority in ("warning", "critical")][:2]
    if urgent:
        parts.append("Urgent: " + "; ".join(urgent))
    return " ".join(parts)[:4000]


async def create_satellite_health_alert(
    db: AsyncSession,
    *,
    user: User,
    result: SatelliteHealthResult,
    analysis_id: uuid.UUID,
    tree_id: uuid.UUID | None = None,
    fence_id: uuid.UUID | None = None,
    target_label: str,
    prior_risk: str | None = None,
) -> Alert | None:
    if not should_alert_satellite_health(result, prior_risk):
        return None

    channels = resolve_channels(user, result.risk_level)
    title = _alert_title(result, target_label=target_label)
    message = _alert_message(result)

    alert = Alert(
        user_id=user.id,
        tree_id=tree_id,
        kind=f"satellite_health_{result.risk_level}",
        severity=_alert_severity(result.risk_level),
        title=title,
        message=message,
        channels=channels,
        delivered={},
        payload={
            "analysis_id": str(analysis_id),
            "risk_level": result.risk_level,
            "health_status": result.health_status,
            "ndvi_current": result.ndvi_current,
            "pest_control_needed": result.pest_control_needed,
            "disease_control_needed": result.disease_control_needed,
            "fence_id": str(fence_id) if fence_id else None,
            "tree_id": str(tree_id) if tree_id else None,
        },
    )
    db.add(alert)
    await db.flush()

    alert.delivered = await dispatch_alert_channels(user, channels, title=title, message=message)
    await db.commit()
    await db.refresh(alert)
    log.info(
        "alert.satellite_health_created",
        alert_id=str(alert.id),
        risk=result.risk_level,
        channels=channels,
    )
    return alert
