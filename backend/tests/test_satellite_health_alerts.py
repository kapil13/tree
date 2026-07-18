"""Tests for satellite health alert gating."""

from app.services.ai.satellite_health import analyze_satellite_ndvi_health
from app.services.ai.satellite_health_types import NdviObservation
from app.services.alerts.service import should_alert_satellite_health
from datetime import UTC, datetime, timedelta


def _obs(day_offset: int, ndvi: float) -> NdviObservation:
    return NdviObservation(
        scene_acquired_at=datetime(2026, 1, 1, tzinfo=UTC) + timedelta(days=30 * day_offset),
        ndvi_mean=ndvi,
        ndvi_min=ndvi - 0.08,
        ndvi_max=ndvi + 0.05,
    )


def test_should_not_alert_low_risk():
    result = analyze_satellite_ndvi_health([_obs(0, 0.62), _obs(1, 0.61)])
    assert not should_alert_satellite_health(result, prior_risk=None)


def test_should_alert_first_high_risk():
    obs = [_obs(i, 0.55 - i * 0.08) for i in range(4)]
    result = analyze_satellite_ndvi_health(obs, area_ha=80)
    assert result.risk_level in ("high", "critical")
    assert should_alert_satellite_health(result, prior_risk=None)


def test_should_not_realert_same_high_risk():
    obs = [_obs(i, 0.55 - i * 0.08) for i in range(4)]
    result = analyze_satellite_ndvi_health(obs, area_ha=80)
    assert not should_alert_satellite_health(result, prior_risk=result.risk_level)


def test_should_alert_on_escalation_to_critical():
    obs = [_obs(0, 0.12)]
    result = analyze_satellite_ndvi_health(obs)
    assert result.risk_level == "critical"
    assert should_alert_satellite_health(result, prior_risk="high")
