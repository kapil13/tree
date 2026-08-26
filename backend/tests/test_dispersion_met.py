"""Dispersion meteorology (Open-Meteo hourly) tests."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.weather.dispersion_met import fetch_dispersion_met


@pytest.mark.asyncio
async def test_fetch_dispersion_met_parses_hourly_wind():
    sample = {
        "latitude": 12.97,
        "longitude": 77.59,
        "timezone": "Asia/Kolkata",
        "hourly": {
            "time": ["2026-08-26T10:00", "2026-08-26T11:00"],
            "windspeed_10m": [10.8, 14.4],
            "winddirection_10m": [90, 180],
            "temperature_2m": [28.0, 29.0],
            "weathercode": [0, 1],
        },
    }

    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    mock_resp.raise_for_status = lambda: None
    mock_resp.json = lambda: sample

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch("app.services.weather.dispersion_met.httpx.AsyncClient", return_value=mock_client):
        met = await fetch_dispersion_met(12.97, 77.59, hours=2)

    assert met.provider == "open-meteo"
    assert len(met.hours) == 2
    assert met.hours[0].wind_speed_ms == pytest.approx(3.0, rel=0.01)
    assert met.hours[0].wind_direction_deg == 90.0
    assert met.hours[0].stability_class in {"A", "B", "C", "D", "E", "F"}
