"""Tests for Copernicus Sentinel Hub SAR sampling."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

from app.services.satellite import sentinel_hub_sar
from app.services.satellite.sar_service import (
    SAR_PROVIDER_SENTINEL_HUB,
    SentinelHubSarService,
    reset_sar_service,
)


def test_build_sample_dict_metrics():
    data = sentinel_hub_sar._build_sample_dict(
        acquired=datetime(2024, 6, 1, tzinfo=UTC),
        vh_db=-12.5,
        vv_db=-8.0,
        lat=28.6,
        lon=77.2,
    )
    assert data["provider"] == "sar-sentinel-hub-s1"
    assert data["frequency_bands"] == ["C"]
    assert 0.0 <= data["wetland_probability"] <= 1.0


def test_sentinel_hub_sar_service_uses_live_sample(monkeypatch):
    reset_sar_service()
    monkeypatch.setattr(sentinel_hub_sar, "sentinel_hub_sar_configured", lambda: True)
    payload = sentinel_hub_sar._build_sample_dict(
        acquired=datetime(2024, 6, 1, tzinfo=UTC),
        vh_db=-11.0,
        vv_db=-7.5,
        lat=28.6,
        lon=77.2,
    )

    with (
        patch(
            "app.services.satellite.sar_service.sample_sentinel1_point_sh",
            new=AsyncMock(return_value=payload),
        ),
        patch(
            "app.services.satellite.sar_service.sentinel_hub_sar_configured",
            return_value=True,
        ),
    ):
        svc = SentinelHubSarService()
        sample = asyncio.run(svc.sample_point(28.6, 77.2))
        assert sample.provider == "sar-sentinel-hub-s1"
        assert svc.name == SAR_PROVIDER_SENTINEL_HUB
