"""Tests for NISAR-inspired SAR analytics."""

from __future__ import annotations

from datetime import UTC, datetime

from app.services.satellite.sar_analytics import analyze_sar_sample
from app.services.satellite.sar_types import SarSample


def _sample(**kwargs) -> SarSample:
    base = dict(
        provider="nisar-sar-stub",
        scene_id="TEST",
        scene_acquired_at=datetime.now(UTC),
        l_band_hh_db=-6.0,
        s_band_hh_db=-10.0,
        vh_hv_ratio=0.3,
        double_bounce_index=0.3,
        wetland_probability=0.3,
        ground_moisture_index=0.4,
        canopy_ground_mismatch=False,
    )
    base.update(kwargs)
    return SarSample(**base)


def test_hidden_moisture_when_canopy_green_but_l_band_elevated():
    sample = _sample(
        l_band_hh_db=-5.0,
        s_band_hh_db=-11.0,
        ground_moisture_index=0.58,
        canopy_ground_mismatch=True,
    )
    result = analyze_sar_sample(sample, ndvi_mean=0.55)
    names = {f.name for f in result.findings}
    assert "sar_hidden_moisture" in names
    assert result.ground_status == "hidden_moisture"
    assert result.risk_level == "high"


def test_wetland_detected_on_high_double_bounce():
    sample = _sample(
        double_bounce_index=0.78,
        wetland_probability=0.82,
        ground_moisture_index=0.75,
    )
    result = analyze_sar_sample(sample, ndvi_mean=0.4)
    names = {f.name for f in result.findings}
    assert "double_bounce_scattering" in names
    assert "wetland_forest_detected" in names
    assert result.ground_status == "wetland_risk"


def test_stable_ground_no_findings():
    sample = _sample()
    result = analyze_sar_sample(sample, ndvi_mean=0.5)
    assert result.risk_level == "low"
    assert result.ground_status == "stable"
    assert not result.findings
