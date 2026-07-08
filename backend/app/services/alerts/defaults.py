"""Default notification preference values."""

from __future__ import annotations

from typing import Any

DEFAULT_SATELLITE_HEALTH_PREFS: dict[str, Any] = {
    "enabled": True,
    "channels": ["in_app", "email"],
    "sms_on_critical": True,
}


def default_notification_preferences() -> dict[str, Any]:
    return {"satellite_health": dict(DEFAULT_SATELLITE_HEALTH_PREFS)}
