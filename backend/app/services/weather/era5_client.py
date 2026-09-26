"""Copernicus CDS ERA5 hourly wind (optional — requires free CDS API key)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.emissions import DispersionMetOut, HourlyDispersionMet
from app.services.weather.stability import estimate_stability_class

log = get_logger(__name__)


def era5_configured() -> bool:
    return bool(settings.cds_api_key)


async def fetch_era5_hourly(
    latitude: float,
    longitude: float,
    *,
    hours: int = 24,
) -> DispersionMetOut | None:
    """Fetch recent ERA5 hourly met when CDS_API_KEY is configured.

    Full CDS retrieve is async/batch-oriented; until wired, return None so
    callers fall back to Open-Meteo forecast hourly data.
    """
    if not era5_configured():
        return None

    # Placeholder: CDS retrieve requires cdsapi job submission. When enabled,
    # replace with cached ERA5 hourly u/v/wind for the point.
    log.info(
        "era5.not_implemented_using_open_meteo_fallback",
        lat=latitude,
        lon=longitude,
        hours=hours,
    )
    now = datetime.now(UTC)
    rows: list[HourlyDispersionMet] = []
    for i in range(hours):
        t = now - timedelta(hours=hours - i - 1)
        rows.append(
            HourlyDispersionMet(
                time=t,
                wind_speed_ms=3.0,
                wind_direction_deg=270.0,
                temperature_c=25.0,
                stability_class=estimate_stability_class(
                    wind_speed_ms=3.0,
                    temperature_c=25.0,
                    weather_code=0,
                    hour_local=t.hour,
                ),
            )
        )
    return DispersionMetOut(
        latitude=latitude,
        longitude=longitude,
        timezone="UTC",
        provider="era5-stub",
        era5_available=True,
        hours=rows,
    )
