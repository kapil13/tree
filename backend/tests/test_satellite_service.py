"""Tests for the stub satellite service."""

from __future__ import annotations

import pytest

from app.services.satellite.service import (
    StubSatelliteService,
    get_satellite_service,
    reset_satellite_service,
)


@pytest.fixture(autouse=True)
def _force_stub(monkeypatch):
    reset_satellite_service()
    monkeypatch.setattr(
        "app.services.satellite.plantation.has_sentinel_credentials",
        lambda: False,
    )
    yield
    reset_satellite_service()


@pytest.mark.asyncio
async def test_single_sample_in_range():
    sat = get_satellite_service()
    assert isinstance(sat, StubSatelliteService)
    s = await sat.sample(12.9716, 77.5946)
    assert s.provider == "sentinel-2-stub"
    assert 0 <= s.ndvi_mean <= 1
    assert s.ndvi_min <= s.ndvi_mean <= s.ndvi_max


@pytest.mark.asyncio
async def test_series_returns_n_months():
    sat = get_satellite_service()
    series = await sat.series(12.9716, 77.5946, months=6)
    assert len(series) == 6
    # ordered chronologically
    times = [s.scene_acquired_at for s in series]
    assert times == sorted(times)
