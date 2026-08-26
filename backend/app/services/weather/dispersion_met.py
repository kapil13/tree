"""Hourly meteorology for GHG dispersion (Open-Meteo + optional ERA5)."""

from __future__ import annotations

from datetime import UTC, datetime

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.emissions import DispersionMetOut, HourlyDispersionMet
from app.services.weather.era5_client import era5_configured, fetch_era5_hourly
from app.services.weather.stability import estimate_stability_class

log = get_logger(__name__)


async def fetch_dispersion_met(
    latitude: float,
    longitude: float,
    *,
    hours: int = 24,
    prefer_era5: bool = False,
) -> DispersionMetOut:
    hours = max(1, min(hours, 72))
    if prefer_era5 and era5_configured():
        try:
            era5 = await fetch_era5_hourly(latitude, longitude, hours=hours)
            if era5 is not None:
                return era5
        except Exception as exc:
            log.warning("era5.fetch_failed", error=str(exc))

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "windspeed_10m,winddirection_10m,temperature_2m,weathercode",
        "forecast_hours": hours,
        "timezone": "auto",
    }
    url = f"{settings.open_meteo_api_url.rstrip('/')}/forecast"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    hourly = data.get("hourly") or {}
    times = hourly.get("time") or []
    speeds = hourly.get("windspeed_10m") or []
    directions = hourly.get("winddirection_10m") or []
    temps = hourly.get("temperature_2m") or []
    codes = hourly.get("weathercode") or []

    rows: list[HourlyDispersionMet] = []
    for idx, ts in enumerate(times[:hours]):
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        speed_kmh = float(speeds[idx]) if idx < len(speeds) and speeds[idx] is not None else 0.0
        speed_ms = speed_kmh / 3.6
        direction = float(directions[idx]) if idx < len(directions) and directions[idx] is not None else 0.0
        temp = float(temps[idx]) if idx < len(temps) and temps[idx] is not None else None
        code = int(codes[idx]) if idx < len(codes) and codes[idx] is not None else None
        rows.append(
            HourlyDispersionMet(
                time=dt,
                wind_speed_ms=round(speed_ms, 3),
                wind_direction_deg=round(direction, 1),
                temperature_c=temp,
                stability_class=estimate_stability_class(
                    wind_speed_ms=speed_ms,
                    temperature_c=temp,
                    weather_code=code,
                    hour_local=dt.hour,
                ),
            )
        )

    if not rows:
        raise ValueError("no hourly met data returned")

    return DispersionMetOut(
        latitude=float(data.get("latitude", latitude)),
        longitude=float(data.get("longitude", longitude)),
        timezone=str(data.get("timezone", "UTC")),
        provider="open-meteo",
        era5_available=era5_configured(),
        hours=rows,
    )
