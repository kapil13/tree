"""Tests for SAR service stub."""

from __future__ import annotations

import asyncio

from app.services.satellite.sar_service import StubSarService, reset_sar_service


def test_stub_sar_sample_is_deterministic():
    reset_sar_service()
    svc = StubSarService()
    a = asyncio.run(svc.sample_point(28.7, 77.2))
    b = asyncio.run(svc.sample_point(28.7, 77.2))
    assert a.l_band_hh_db == b.l_band_hh_db
    assert a.wetland_probability == b.wetland_probability
    assert a.frequency_bands == ["L", "S"]


def test_stub_sar_polygon_uses_centroid():
    reset_sar_service()
    svc = StubSarService()
    boundary = {
        "type": "Polygon",
        "coordinates": [[[77.1, 28.6], [77.2, 28.6], [77.2, 28.7], [77.1, 28.7], [77.1, 28.6]]],
    }
    sample = asyncio.run(svc.sample_polygon(boundary))
    assert sample.provider == "nisar-sar-stub"
    assert sample.double_bounce_index >= 0.0
    meta = sample.to_raw_metadata()
    assert meta["modality"] == "sar"
    assert "l_band_hh_db" in meta
