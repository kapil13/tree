"""Tests for Phase 3 monitoring automation."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from app.services.monitoring.alert_engine import PREFS_MAP, _resolve_channels
from app.services.monitoring.compliance_escalation import ESCALATION_DAYS
from app.services.monitoring.health_roundup import STALE_ANALYSIS_DAYS
from app.services.monitoring.satellite_sweep import NDVI_DEGRADATION_THRESHOLD


class _User:
    def __init__(self, phone=None, prefs=None):
        self.phone = phone
        self.notification_preferences = prefs


def test_ndvi_degradation_threshold():
    assert NDVI_DEGRADATION_THRESHOLD == -0.15
    assert -0.20 <= NDVI_DEGRADATION_THRESHOLD


def test_escalation_days():
    assert ESCALATION_DAYS == 7


def test_stale_analysis_days():
    assert STALE_ANALYSIS_DAYS == 90


def test_resolve_channels_includes_in_app():
    user = _User()
    channels = _resolve_channels(user, "monitoring", "medium")
    assert "in_app" in channels


def test_resolve_channels_critical_sms_when_enabled():
    user = _User(
        phone="+919999999999",
        prefs={
            "monitoring": {
                "enabled": True,
                "channels": ["email"],
                "sms_on_critical": True,
            }
        },
    )
    channels = _resolve_channels(user, "monitoring", "critical")
    assert "sms" in channels


def test_resolve_channels_respects_disabled_prefs():
    user = _User(prefs={"monitoring": {"enabled": False, "channels": ["email", "sms"]}})
    channels = _resolve_channels(user, "monitoring", "high")
    assert channels == ["in_app"]


def test_prefs_map_has_monitoring_keys():
    assert "monitoring" in PREFS_MAP
    assert "satellite_health" in PREFS_MAP


class _Tree:
    def __init__(self, *, health="good", last_analysis=None, satellite_verified=True, last_satellite=None):
        self.id = uuid.uuid4()
        self.owner_user_id = uuid.uuid4()
        self.status = "alive"
        self.current_health = health
        self.last_analysis_at = last_analysis
        self.satellite_verified = satellite_verified
        self.last_satellite_at = last_satellite


def _should_flag_tree(tree: _Tree) -> bool:
    """Mirror health_roundup flag logic for unit testing."""
    cutoff = datetime.now(UTC) - timedelta(days=STALE_ANALYSIS_DAYS)
    stale = tree.last_analysis_at is None or tree.last_analysis_at <= cutoff
    poor_health = tree.current_health in ("poor", "critical", "dead")
    low_satellite = tree.satellite_verified is False and tree.last_satellite_at is not None
    return poor_health or stale or low_satellite


def test_health_roundup_flags_poor_health():
    assert _should_flag_tree(_Tree(health="poor"))


def test_health_roundup_flags_stale_analysis():
    old = datetime.now(UTC) - timedelta(days=STALE_ANALYSIS_DAYS + 1)
    assert _should_flag_tree(_Tree(last_analysis=old))


def test_health_roundup_flags_failed_satellite():
    assert _should_flag_tree(
        _Tree(satellite_verified=False, last_satellite=datetime.now(UTC))
    )


def test_health_roundup_skips_healthy_tree():
    recent = datetime.now(UTC) - timedelta(days=7)
    assert not _should_flag_tree(_Tree(health="good", last_analysis=recent))
