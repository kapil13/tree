"""Weather forecast via Open-Meteo (free, no API key required)."""

from __future__ import annotations

from datetime import date

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.weather import DailyForecast, WeatherForecast

log = get_logger(__name__)

# WMO weather interpretation codes (Open-Meteo)
_WMO_DESCRIPTIONS: dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def wmo_description(code: int) -> str:
    return _WMO_DESCRIPTIONS.get(code, "Unknown")


async def fetch_forecast(
    latitude: float,
    longitude: float,
    *,
    days: int = 5,
) -> WeatherForecast:
    """Fetch daily forecast for a point (plantation centroid)."""
    days = max(1, min(days, 7))
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": "weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max",
        "forecast_days": days,
        "timezone": "auto",
    }
    url = f"{settings.open_meteo_api_url.rstrip('/')}/forecast"

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, params=params)
        if resp.status_code >= 400:
            log.warning("open_meteo_error", status=resp.status_code, body=resp.text[:300])
        resp.raise_for_status()
        payload = resp.json()

    daily = payload.get("daily") or {}
    dates_raw: list[str] = daily.get("time") or []
    codes: list[int] = daily.get("weathercode") or []
    tmax: list[float] = daily.get("temperature_2m_max") or []
    tmin: list[float] = daily.get("temperature_2m_min") or []
    precip: list[float] = daily.get("precipitation_sum") or []
    wind: list[float | None] = daily.get("windspeed_10m_max") or []

    forecast_days: list[DailyForecast] = []
    for i, d in enumerate(dates_raw[:days]):
        code = int(codes[i]) if i < len(codes) else 0
        forecast_days.append(
            DailyForecast(
                date=date.fromisoformat(d),
                weather_code=code,
                description=wmo_description(code),
                temp_min_c=round(float(tmin[i]), 1) if i < len(tmin) else 0.0,
                temp_max_c=round(float(tmax[i]), 1) if i < len(tmax) else 0.0,
                precipitation_mm=round(float(precip[i]), 1) if i < len(precip) else 0.0,
                wind_max_kmh=round(float(wind[i]), 1) if i < len(wind) and wind[i] is not None else None,
            )
        )

    return WeatherForecast(
        latitude=float(payload.get("latitude", latitude)),
        longitude=float(payload.get("longitude", longitude)),
        timezone=str(payload.get("timezone") or "UTC"),
        provider="open-meteo",
        days=forecast_days,
    )
