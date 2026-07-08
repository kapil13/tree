"""Create and dispatch alerts (in-app + email/SMS)."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.alert import Alert
from app.models.user import User
from app.services.ai.satellite_health_types import SatelliteHealthResult
from app.services.alerts.defaults import DEFAULT_SATELLITE_HEALTH_PREFS
from app.services.notifications.notifier import Channel, get_notifier

log = get_logger("alerts")

RISK_ORDER = {"low": 0, "moderate": 1, "high": 2, "critical": 3}

def satellite_health_prefs(user: User) -> dict[str, Any]:
    prefs = user.notification_preferences or default_notification_preferences()
    sh = prefs.get("satellite_health") or {}
    return {**DEFAULT_SATELLITE_HEALTH_PREFS, **sh}


def resolve_channels(user: User, risk_level: str) -> list[Channel]:
    sh = satellite_health_prefs(user)
    if not sh.get("enabled", True):
        return ["in_app"]

    channels: list[Channel] = ["in_app"]
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

    return channels


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

    notifier = get_notifier()
    delivered: dict[str, Any] = {}
    for channel in channels:
        if channel == "in_app":
            delivered["in_app"] = {"delivered": True}
            continue
        to = user.email if channel == "email" else user.phone if channel == "sms" else ""
        if not to:
            delivered[channel] = {"delivered": False, "info": "no_destination"}
            continue
        try:
            nr = await notifier.send(channel=channel, to=to, title=title, message=message)
            delivered[channel] = {"delivered": nr.delivered, "info": nr.info}
        except Exception as exc:
            log.warning("alert.dispatch_failed", channel=channel, error=str(exc))
            delivered[channel] = {"delivered": False, "info": str(exc)}

    alert.delivered = delivered
    await db.commit()
    await db.refresh(alert)
    log.info(
        "alert.satellite_health_created",
        alert_id=str(alert.id),
        risk=result.risk_level,
        channels=channels,
    )
    return alert
