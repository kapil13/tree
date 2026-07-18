"""Default notification preference values."""

from __future__ import annotations

from typing import Any

DEFAULT_SATELLITE_HEALTH_PREFS: dict[str, Any] = {
    "enabled": True,
    "channels": ["in_app", "email"],
    "sms_on_critical": True,
}

DEFAULT_THREAT_WATCH_PREFS: dict[str, Any] = {
    "enabled": True,
    "channels": ["in_app", "email"],
    "sms_on_critical": False,
}

DEFAULT_SURVIVAL_SURVEY_PREFS: dict[str, Any] = {
    "enabled": True,
    "channels": ["in_app", "email"],
    "survey_interval_days": 30,
}


def default_notification_preferences() -> dict[str, Any]:
    return {
        "satellite_health": dict(DEFAULT_SATELLITE_HEALTH_PREFS),
        "threat_watch": dict(DEFAULT_THREAT_WATCH_PREFS),
        "survival_survey": dict(DEFAULT_SURVIVAL_SURVEY_PREFS),
    }
