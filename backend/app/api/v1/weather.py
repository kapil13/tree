"""Weather forecast endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.deps import DB, CurrentUser, require_satellite_feature
from app.schemas.emissions import DispersionMetOut
from app.schemas.weather import WeatherForecast
from app.services.weather.dispersion_met import fetch_dispersion_met
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


@router.get("/dispersion-met", response_model=DispersionMetOut)
async def get_dispersion_met(
    user: CurrentUser,
    db: DB,
    _satellite: None = Depends(require_satellite_feature),
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    hours: int = Query(24, ge=1, le=72),
) -> DispersionMetOut:
    """Hourly wind direction, speed, and stability class for plume modeling."""
    try:
        return await fetch_dispersion_met(latitude, longitude, hours=hours)
    except Exception as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=f"dispersion_met_unavailable: {exc}",
        ) from exc
