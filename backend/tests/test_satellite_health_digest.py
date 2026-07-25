"""Tests for daily satellite health digest."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest

from app.services.monitoring.satellite_health_digest import (
    DIGEST_KIND,
    build_digest_content,
    digest_severity,
    is_satellite_health_alert,
)


class _Alert:
    def __init__(self, *, kind: str, severity: str = "medium", title: str = "Test"):
        self.id = uuid.uuid4()
        self.kind = kind
        self.severity = severity
        self.title = title


def test_is_satellite_health_alert_ndvi():
    assert is_satellite_health_alert("ndvi_degradation")


def test_is_satellite_health_alert_satellite_kinds():
    assert is_satellite_health_alert("satellite_health_high")
    assert is_satellite_health_alert("satellite_health_critical")


def test_is_satellite_health_alert_excludes_digest():
    assert not is_satellite_health_alert(DIGEST_KIND)


def test_is_satellite_health_alert_excludes_unrelated():
    assert not is_satellite_health_alert("health_roundup")
    assert not is_satellite_health_alert("threat_watch")


def test_digest_severity_critical_wins():
    alerts = [
        _Alert(kind="ndvi_degradation", severity="high"),
        _Alert(kind="satellite_health_critical", severity="critical"),
    ]
    assert digest_severity(alerts) == "critical"


def test_digest_severity_high_when_no_critical():
    alerts = [_Alert(kind="ndvi_degradation", severity="high")]
    assert digest_severity(alerts) == "high"


def test_digest_severity_medium_for_low_alerts():
    alerts = [_Alert(kind="ndvi_degradation", severity="medium")]
    assert digest_severity(alerts) == "medium"


def test_build_digest_content_includes_counts():
    alerts = [
        _Alert(kind="ndvi_degradation", severity="high", title="NDVI drop — T-001"),
        _Alert(kind="satellite_health_critical", severity="critical", title="Critical — Block A"),
    ]
    title, message, payload = build_digest_content(alerts, digest_date="2026-07-25")
    assert "2 alert" in title
    assert "2026-07-25" in title
    assert "NDVI drops: 1" in message
    assert payload["alert_count"] == 2
    assert payload["critical_count"] == 1
    assert payload["high_count"] == 1
    assert "NDVI drop — T-001" in message


@pytest.mark.asyncio
async def test_run_daily_digest_skips_disabled_prefs(monkeypatch):
    from app.services.monitoring import satellite_health_digest as mod

    user_id = uuid.uuid4()
    alert = _Alert(kind="ndvi_degradation", severity="high")
    alert.user_id = user_id  # type: ignore[attr-defined]
    alert.created_at = datetime.now(UTC)  # type: ignore[attr-defined]

    class _User:
        id = user_id
        notification_preferences = {"satellite_health": {"enabled": False}}

    class _Scalars:
        def all(self):
            return [alert]

    class _Result:
        def scalars(self):
            return _Scalars()

    class _DB:
        async def execute(self, _stmt):
            return _Result()

        async def get(self, _model, uid):
            return _User() if uid == user_id else None

        async def commit(self):
            pass

    create_called = False

    async def _fake_create(*_args, **_kwargs):
        nonlocal create_called
        create_called = True
        return None

    monkeypatch.setattr(mod, "create_monitoring_alert", _fake_create)
    result = await mod.run_daily_satellite_health_digest(_DB())  # type: ignore[arg-type]
    assert result["users_skipped"] == 1
    assert result["digests_sent"] == 0
    assert not create_called


@pytest.mark.asyncio
async def test_run_daily_digest_sends_when_enabled(monkeypatch):
    from app.services.monitoring import satellite_health_digest as mod

    user_id = uuid.uuid4()
    alert = _Alert(kind="ndvi_degradation", severity="high", title="NDVI drop")
    alert.user_id = user_id  # type: ignore[attr-defined]
    alert.created_at = datetime.now(UTC)  # type: ignore[attr-defined]

    class _User:
        id = user_id
        notification_preferences = {"satellite_health": {"enabled": True, "daily_digest": True}}

    class _Scalars:
        def all(self):
            return [alert]

    class _Result:
        def scalars(self):
            return _Scalars()

    class _DB:
        async def execute(self, _stmt):
            return _Result()

        async def get(self, _model, uid):
            return _User() if uid == user_id else None

        async def commit(self):
            pass

    create_called = False

    async def _fake_create(db, *, user, kind, **_kwargs):
        nonlocal create_called
        create_called = True
        assert kind == DIGEST_KIND
        assert user.id == user_id
        return _Alert(kind=kind)

    monkeypatch.setattr(mod, "create_monitoring_alert", _fake_create)
    result = await mod.run_daily_satellite_health_digest(_DB())  # type: ignore[arg-type]
    assert result["digests_sent"] == 1
    assert create_called
