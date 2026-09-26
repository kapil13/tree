"""5-day weather forecast via Open-Meteo."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.weather.open_meteo import fetch_forecast, wmo_description


def test_wmo_description():
    assert wmo_description(0) == "Clear sky"
    assert wmo_description(95) == "Thunderstorm"


@pytest.mark.asyncio
async def test_fetch_forecast_parses_response():
    sample = {
        "latitude": 12.97,
        "longitude": 77.59,
        "timezone": "Asia/Kolkata",
        "daily": {
            "time": ["2026-07-08", "2026-07-09"],
            "weathercode": [0, 61],
            "temperature_2m_max": [32.0, 29.5],
            "temperature_2m_min": [22.0, 21.0],
            "precipitation_sum": [0.0, 4.2],
            "windspeed_10m_max": [12.0, 18.0],
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

    with patch("app.services.weather.open_meteo.httpx.AsyncClient", return_value=mock_client):
        forecast = await fetch_forecast(12.97, 77.59, days=2)

    assert len(forecast.days) == 2
    assert forecast.days[0].temp_max_c == 32.0
    assert forecast.days[1].description == "Slight rain"
