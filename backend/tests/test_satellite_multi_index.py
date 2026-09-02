"""Phase 0 multi-index satellite parsing tests."""

from __future__ import annotations

from app.services.satellite.plantation import _sample_from_stats, _synthetic_indices_from_ndvi
from app.services.satellite.sentinel_hub import _multi_index_from_entry


def test_multi_index_from_entry_parses_outputs():
    entry = {
        "interval": {"from": "2025-06-01T00:00:00Z"},
        "outputs": {
            "ndvi": {"bands": {"B0": {"stats": {"mean": 0.55, "sampleCount": 10}}}},
            "evi": {"bands": {"B0": {"stats": {"mean": 0.42, "sampleCount": 10}}}},
            "savi": {"bands": {"B0": {"stats": {"mean": 0.48, "sampleCount": 10}}}},
            "ndmi": {"bands": {"B0": {"stats": {"mean": 0.21, "sampleCount": 10}}}},
            "ndwi": {"bands": {"B0": {"stats": {"mean": -0.1, "sampleCount": 10}}}},
            "bsi": {"bands": {"B0": {"stats": {"mean": 0.05, "sampleCount": 10}}}},
            "dataMask": {"bands": {"B0": {"stats": {"sampleCount": 80}}}},
        },
    }
    stats = _multi_index_from_entry(entry)
    assert stats is not None
    assert stats["ndvi_mean"] == 0.55
    assert stats["evi_mean"] == 0.42
    assert stats["valid_pixel_count"] == 80.0


def test_sample_from_stats_multi_index():
    from datetime import UTC, datetime

    ts = datetime(2025, 6, 1, tzinfo=UTC)
    stats = {
        "ndvi_mean": 0.6,
        "evi_mean": 0.45,
        "savi_mean": 0.5,
        "ndmi_mean": 0.2,
        "ndwi_mean": -0.05,
        "bsi_mean": 0.1,
        "valid_pixel_pct": 90.0,
        "mean": 0.6,
        "min": 0.5,
        "max": 0.7,
    }
    sample = _sample_from_stats(12.97, 77.59, ts, stats)
    assert sample.ndvi_mean == 0.6
    assert sample.indices is not None
    assert sample.indices["savi_mean"] == 0.5


def test_synthetic_indices_from_ndvi():
    indices = _synthetic_indices_from_ndvi(0.5)
    assert indices["ndvi_mean"] == 0.5
    assert "evi_mean" in indices
    assert indices["valid_pixel_pct"] == 92.0
