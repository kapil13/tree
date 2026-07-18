"""Weather forecast endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.api.v1.deps import CurrentUser
from app.schemas.weather import WeatherForecast
from app.services.weather.open_meteo import fetch_forecast

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("/forecast", response_model=WeatherForecast)
async def get_forecast(
    user: CurrentUser,
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    days: int = Query(5, ge=1, le=7),
) -> WeatherForecast:
    """5-day (default) weather forecast for a map point."""
    try:
        return await fetch_forecast(latitude, longitude, days=days)
    except Exception as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=f"weather_forecast_unavailable: {exc}",
        ) from exc
