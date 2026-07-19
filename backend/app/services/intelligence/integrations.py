"""Health checks for external data integrations."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.core.config import settings
from app.services.satellite.bhoonidhi_client import has_bhoonidhi_credentials
from app.services.satellite.plantation import has_sentinel_credentials


async def _ping_open_meteo(timeout: float = 3.0) -> dict[str, Any]:
    url = f"{settings.open_meteo_api_url.rstrip('/')}/forecast"
    params = {
        "latitude": 28.6,
        "longitude": 77.2,
        "daily": "temperature_2m_max",
        "forecast_days": 1,
        "timezone": "UTC",
    }
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
        return {"status": "ok", "reachable": True, "error": None}
    except Exception as exc:
        return {"status": "error", "reachable": False, "error": str(exc)}


async def _ping_gbif(timeout: float = 3.0) -> dict[str, Any]:
    url = f"{settings.gbif_api_url.rstrip('/')}/occurrence/search"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, params={"limit": 0})
            resp.raise_for_status()
        return {"status": "ok", "reachable": True, "error": None}
    except Exception as exc:
        return {"status": "error", "reachable": False, "error": str(exc)}


async def build_integrations_health(*, ping_remote: bool = True) -> dict[str, Any]:
    sentinel_configured = has_sentinel_credentials()
    bhoonidhi_configured = has_bhoonidhi_credentials()
    iucn_configured = bool(settings.iucn_api_token)

    if ping_remote:
        open_meteo, gbif = await asyncio.gather(_ping_open_meteo(), _ping_gbif())
    else:
        open_meteo = {"status": "skipped", "reachable": None, "error": None}
        gbif = {"status": "skipped", "reachable": None, "error": None}

    integrations = {
        "open_meteo": open_meteo,
        "gbif": gbif,
        "sentinel_hub": {
            "status": "configured" if sentinel_configured else "not_configured",
            "reachable": sentinel_configured,
            "error": None if sentinel_configured else "missing_credentials",
        },
        "bhoonidhi": {
            "status": "configured" if bhoonidhi_configured else "not_configured",
            "reachable": bhoonidhi_configured,
            "error": None if bhoonidhi_configured else "missing_credentials",
        },
        "iucn": {
            "status": "configured" if iucn_configured else "optional",
            "reachable": iucn_configured,
            "error": None if iucn_configured else "token_optional",
        },
    }

    degraded = ping_remote and any(
        v.get("status") == "error" or (v.get("reachable") is False and v.get("status") == "configured")
        for v in integrations.values()
    )
    return {
        "status": "degraded" if degraded else "ok",
        "integrations": integrations,
    }


async def check_all_integrations() -> dict[str, Any]:
    """Alias used by /health/integrations."""
    return await build_integrations_health()
