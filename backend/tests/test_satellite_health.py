"""Tests for NDVI satellite health analyzer."""

from datetime import UTC, datetime, timedelta

from app.services.ai.satellite_health import analyze_satellite_ndvi_health
from app.services.ai.satellite_health_types import NdviObservation


def _obs(day_offset: int, ndvi: float, ndvi_min: float, ndvi_max: float) -> NdviObservation:
    return NdviObservation(
        scene_acquired_at=datetime(2026, 1, 1, tzinfo=UTC) + timedelta(days=30 * day_offset),
        ndvi_mean=ndvi,
        ndvi_min=ndvi_min,
        ndvi_max=ndvi_max,
        change_vs_baseline=-0.05,
    )


def test_healthy_stable_canopy():
    obs = [_obs(i, 0.62, 0.55, 0.68) for i in range(4)]
    result = analyze_satellite_ndvi_health(obs)
    assert result.risk_level == "low"
    assert result.pest_control_needed is False
    assert result.disease_control_needed is False


def test_declining_patchy_triggers_pest_and_disease():
    obs = [
        _obs(0, 0.58, 0.52, 0.62),
        _obs(1, 0.50, 0.40, 0.58),
        _obs(2, 0.42, 0.28, 0.55),
        _obs(3, 0.35, 0.22, 0.50),
    ]
    result = analyze_satellite_ndvi_health(obs, area_ha=120)
    assert result.ndvi_trend == "declining"
    assert result.pest_control_needed or result.disease_control_needed
    assert len(result.treatments) >= 2


def test_critical_low_ndvi():
    obs = [_obs(0, 0.12, 0.08, 0.15)]
    result = analyze_satellite_ndvi_health(obs)
    assert result.risk_level == "critical"
    assert any(t.priority == "critical" for t in result.treatments)
