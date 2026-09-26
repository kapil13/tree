"""Threat watch data freshness metadata."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.monitoring.data_freshness import build_site_data_freshness


@pytest.mark.asyncio
async def test_build_site_data_freshness_flags_stale_inputs():
    fence_id = uuid.uuid4()
    db = AsyncMock()
    old = datetime.now(UTC) - timedelta(days=10)
    optical = MagicMock()
    optical.scene_acquired_at = datetime.now(UTC) - timedelta(days=90)
    optical.provider = "sentinel-2"

    with (
        patch(
            "app.services.monitoring.data_freshness.sar_fence_snapshot",
            AsyncMock(
                return_value={
                    "last_sar_at": old.isoformat(),
                    "days_since_sar_scan": 10,
                    "sar_provider": "sar-stub",
                    "sar_stale": False,
                    "sar_live": False,
                }
            ),
        ),
        patch(
            "app.services.monitoring.data_freshness._latest_optical_scene",
            AsyncMock(return_value=optical),
        ),
    ):
        result = await build_site_data_freshness(
            db,
            fence_id,
            intel={
                "ndvi_trend": "declining",
                "satellite_health": {"created_at": (datetime.now(UTC) - timedelta(days=8)).isoformat()},
                "weather": {"generated_at": datetime.now(UTC).isoformat()},
            },
        )

    assert result["satellite_health_stale"] is True
    assert result["optical_stale"] is True
    assert result["sar_provider_mode"] == "stub"
    assert result["ndvi_source"] == "ecosystem"
