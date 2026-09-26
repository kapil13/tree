"""Tests for SAR + optical fusion (Phase 2)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.services.satellite.sar_fusion import OpticalContext, analyze_sar_fusion
from app.services.satellite.sar_types import SarSample


def _sample(**kwargs) -> SarSample:
    base = {
        "provider": "nisar-sar-stub",
        "scene_id": "TEST",
        "scene_acquired_at": datetime.now(UTC),
        "l_band_hh_db": -6.0,
        "s_band_hh_db": -11.0,
        "vh_hv_ratio": 0.3,
        "double_bounce_index": 0.75,
        "wetland_probability": 0.7,
        "ground_moisture_index": 0.65,
        "canopy_ground_mismatch": True,
    }
    base.update(kwargs)
    return SarSample(**base)


def test_monsoon_gap_fill_when_optical_stale():
    optical = OpticalContext(
        ndvi_mean=0.55,
        cloud_cover_pct=10.0,
        scene_acquired_at=datetime.now(UTC) - timedelta(days=50),
        provider="sentinel-2",
    )
    result = analyze_sar_fusion(_sample(), optical=optical)
    assert result.monitoring_mode == "sar_gap_fill"
    assert any(f.name == "sar_monsoon_gap_fill" for f in result.findings)


def test_canopy_green_but_waterlogged_finding():
    optical = OpticalContext(
        ndvi_mean=0.52,
        cloud_cover_pct=5.0,
        scene_acquired_at=datetime.now(UTC) - timedelta(days=5),
        provider="sentinel-2",
    )
    result = analyze_sar_fusion(_sample(), optical=optical)
    names = {f.name for f in result.findings}
    assert "canopy_green_but_waterlogged" in names
    assert result.monitoring_mode == "optical_sar_divergent"
    assert 0 <= result.forest_integrity_score <= 100


def test_aligned_high_integrity():
    optical = OpticalContext(
        ndvi_mean=0.6,
        cloud_cover_pct=5.0,
        scene_acquired_at=datetime.now(UTC) - timedelta(days=3),
        provider="sentinel-2",
    )
    sample = _sample(
        double_bounce_index=0.2,
        wetland_probability=0.2,
        ground_moisture_index=0.3,
        canopy_ground_mismatch=False,
    )
    result = analyze_sar_fusion(sample, optical=optical)
    assert result.integrity_grade in {"excellent", "good", "fair"}
    assert result.monitoring_mode == "aligned"
