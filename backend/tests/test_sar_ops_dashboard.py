"""Tests for SAR supervisor ops dashboard (Phase 3.3–3.6)."""

from __future__ import annotations

from app.services.monitoring.sar_ops_dashboard import sar_recommended_action


def test_recommended_action_stale():
    action = sar_recommended_action({"sar_stale": True})
    assert "older than 35 days" in action


def test_recommended_action_divergent():
    action = sar_recommended_action({"sar_monitoring_mode": "optical_sar_divergent"})
    assert "drainage" in action.lower()


def test_recommended_action_wetland():
    action = sar_recommended_action({"sar_ground_status": "wetland_risk"})
    assert "waterlogging" in action.lower() or "moisture" in action.lower()


def test_recommended_action_gap_fill():
    action = sar_recommended_action({"sar_monitoring_mode": "sar_gap_fill"})
    assert "monsoon" in action.lower()


def test_recommended_action_at_risk():
    action = sar_recommended_action({"sar_at_risk": True, "sar_forest_integrity": 42.0})
    assert "at risk" in action.lower()


def test_recommended_action_healthy():
    action = sar_recommended_action({"sar_forest_integrity": 72.0})
    assert "routine" in action.lower()


def test_recommended_action_no_baseline():
    action = sar_recommended_action({})
    assert "baseline" in action.lower()
