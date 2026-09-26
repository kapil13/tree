"""5-day weather forecast schemas."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class DailyForecast(BaseModel):
    date: date
    weather_code: int
    description: str
    temp_min_c: float
    temp_max_c: float
    precipitation_mm: float
    wind_max_kmh: float | None = None


class WeatherForecast(BaseModel):
    latitude: float
    longitude: float
    timezone: str
    provider: str = "open-meteo"
    days: list[DailyForecast] = Field(..., min_length=1, max_length=7)
