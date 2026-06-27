"""Tests for Sentinel Hub Statistical API client (mocked HTTP)."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest

from app.services.satellite.sentinel_hub import SentinelHubClient, bbox_wgs84_around_point


def test_bbox_around_point_orders_lon_lat():
    bbox = bbox_wgs84_around_point(12.97, 77.59, buffer_m=15.0)
    assert bbox[0] < 77.59 < bbox[2]
    assert bbox[1] < 12.97 < bbox[3]


@pytest.mark.asyncio
async def test_fetch_latest_sample_parses_response():
    client = SentinelHubClient(
        "id",
        "secret",
        api_base_url="https://sh.example.com",
        token_url="https://auth.example.com/token",
    )
    stats_payload = {
        "status": "OK",
        "data": [
            {
                "interval": {"from": "2024-06-01T00:00:00Z", "to": "2024-06-02T00:00:00Z"},
                "outputs": {
                    "data": {
                        "bands": {
                            "B0": {
                                "stats": {
                                    "min": 0.3,
                                    "max": 0.7,
                                    "mean": 0.55,
                                    "sampleCount": 12,
                                }
                            }
                        }
                    }
                },
            }
        ],
    }

    with patch.object(client, "_get_token", AsyncMock(return_value="tok")):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            stats_resp = AsyncMock()
            stats_resp.status_code = 200
            stats_resp.raise_for_status = lambda: None
            stats_resp.json = lambda: stats_payload
            mock_post.return_value = stats_resp

            result = await client.fetch_latest_sample(12.97, 77.59)

    assert result is not None
    ts, stats = result
    assert ts == datetime(2024, 6, 1, tzinfo=UTC)
    assert stats["mean"] == 0.55


@pytest.mark.asyncio
async def test_sentinel_hub_service_selected_when_credentials_set(monkeypatch):
    from app.core.config import settings
    from app.services.satellite.service import (
        SentinelHubSatelliteService,
        get_satellite_service,
        reset_satellite_service,
    )

    monkeypatch.setattr(settings, "sentinel_hub_client_id", "test-id")
    monkeypatch.setattr(settings, "sentinel_hub_client_secret", "test-secret")
    reset_satellite_service()
    svc = get_satellite_service()
    assert isinstance(svc, SentinelHubSatelliteService)
    reset_satellite_service()
    monkeypatch.setattr(settings, "sentinel_hub_client_id", None)
    monkeypatch.setattr(settings, "sentinel_hub_client_secret", None)
