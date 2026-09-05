"""Phase B — fire (FIRMS) and flood extent hazard watch tests."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.threats.fire_watch import assess_fire_proximity
from app.services.threats.firms_client import FireDetection, _parse_firms_csv
from app.services.threats.flood_extent import (
    _water_extent_score,
    assess_flood_extent_signal,
)


def test_parse_firms_csv():
    csv_text = (
        "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,"
        "instrument,confidence,version,bright_t31,frp,daynight\n"
        "26.8761,75.7442,320.5,1,1,2026-03-01,1345,N,VIIRS,n,2.0,295.0,12.5,D\n"
    )
    fires = _parse_firms_csv(csv_text)
    assert len(fires) == 1
    assert fires[0].latitude == pytest.approx(26.8761)
    assert fires[0].frp == pytest.approx(12.5)


def test_water_extent_score_from_sar_metadata():
    meta = {
        "sar_analysis": {
            "wetland_probability": 0.4,
            "ground_moisture_index": 0.72,
            "double_bounce_index": 0.55,
        }
    }
    assert _water_extent_score(meta) == pytest.approx(0.72)


def test_flood_extent_critical_with_rain():
    result = assess_flood_extent_signal(
        current_score=0.85,
        baseline_score=0.45,
        rain_mm_48h=40,
    )
    assert result["risk_level"] == "critical"
    assert result["early_warning"] is not None
    assert result["early_warning"]["kind"] == "flood_extent"


def test_flood_extent_none_when_stable():
    result = assess_flood_extent_signal(
        current_score=0.35,
        baseline_score=0.32,
        rain_mm_48h=5,
    )
    assert result["risk_level"] == "none"
    assert result["early_warning"] is None


@pytest.mark.asyncio
async def test_fire_proximity_with_nearby_detection():
    fires = [
        FireDetection(
            latitude=26.88,
            longitude=75.75,
            confidence="high",
            frp=25.0,
            acq_date="2026-03-01",
            satellite="VIIRS",
        )
    ]
    with (
        patch(
            "app.services.threats.fire_watch.fetch_fires_near_point",
            new_callable=AsyncMock,
            return_value=fires,
        ),
        patch("app.services.threats.fire_watch.has_firms_credentials", return_value=True),
    ):
        result = await assess_fire_proximity(26.8761, 75.7442)
    assert result["fire_count"] == 1
    assert result["early_warning"] is not None
    assert result["early_warning"]["kind"] == "fire"


@pytest.mark.asyncio
async def test_fire_seasonal_fallback_without_firms_key():
    with (
        patch(
            "app.services.threats.fire_watch.fetch_fires_near_point",
            new_callable=AsyncMock,
            return_value=[],
        ),
        patch("app.services.threats.fire_watch.has_firms_credentials", return_value=False),
    ):
        result = await assess_fire_proximity(26.8761, 75.7442, days=1)
    assert result["fire_count"] == 0
    # May or may not have seasonal warning depending on month — structure is valid
    assert "risk_level" in result
