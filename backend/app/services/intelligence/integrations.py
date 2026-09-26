"""Health checks for external data integrations."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.core.config import settings
from app.services.ai.service import ai_service_status
from app.services.intelligence.integration_gates import integration_gate_summary
from app.services.monitoring.worker_health import build_bioacoustic_health
from app.services.satellite.bhoonidhi_client import has_bhoonidhi_credentials
from app.services.satellite.plantation import has_sentinel_credentials
from app.services.satellite.sar_service import has_sar_credentials
from app.services.threats.firms_client import has_firms_credentials
from app.services.threats.locust_feed import has_locust_feed, locust_feed_source


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


def _ai_pipeline_status() -> dict[str, Any]:
    """Honest mode for tree AI — reflects configured OpenAI/Gemini keys."""
    return ai_service_status()


def _assistant_chat_status() -> dict[str, Any]:
    """Chat assistant uses OpenAI first, then Gemini; otherwise rules engine."""
    if settings.openai_api_key:
        return {
            "status": "configured",
            "mode": "live",
            "label": "OpenAI chat (gpt-4o-mini) with Gemini fallback for AI assistant",
            "reachable": True,
            "error": None,
            "provider": "openai",
        }
    if settings.gemini_api_key:
        return {
            "status": "configured",
            "mode": "live",
            "label": "Gemini chat (gemini-2.5-flash+) for AI assistant",
            "reachable": True,
            "error": None,
            "provider": "gemini",
        }
    return {
        "status": "not_configured",
        "mode": "rules",
        "label": "No LLM key — AI assistant uses portfolio rules engine only",
        "reachable": False,
        "error": "missing_credentials",
        "provider": "rules",
    }


def _tree_satellite_status() -> dict[str, Any]:
    if has_sentinel_credentials():
        return {
            "status": "configured",
            "mode": "live",
            "label": "Sentinel Hub NDVI for individual trees (10 m chips)",
            "reachable": True,
            "error": None,
            "provider": "sentinel-2",
        }
    return {
        "status": "estimate",
        "mode": "estimate",
        "label": "Simulated seasonal NDVI for individual trees (configure Sentinel Hub for live data)",
        "reachable": True,
        "error": "missing_credentials",
        "provider": "stub",
    }


def _sar_status() -> dict[str, Any]:
    if not settings.sar_enabled:
        return {
            "status": "disabled",
            "mode": "disabled",
            "label": "SAR monitoring disabled in configuration",
            "reachable": False,
            "error": "feature_disabled",
        }
    configured = has_sar_credentials()
    return {
        "status": "configured" if configured else "not_configured",
        "mode": "live" if configured else "estimate",
        "label": (
            "SAR monitoring credentials configured"
            if configured
            else "SAR uses stub provider until GEE or Sentinel Hub SAR is configured"
        ),
        "reachable": configured,
        "error": None if configured else "missing_credentials",
    }


def _locust_feed_status() -> dict[str, Any]:
    """Locust watch can use a custom feed, FAO DLIS, or seasonal corridor heuristics."""
    custom_feed = has_locust_feed()
    fao_enabled = settings.fao_locust_feed_enabled
    source = locust_feed_source()

    if custom_feed:
        label = "Configured locust observation feed"
        status = "configured"
        mode = "live"
    elif fao_enabled:
        label = (
            "FAO locust feed active with seasonal corridor fallback"
            if source == "fao_feed"
            else "FAO locust feed enabled; seasonal corridor fallback until observations load"
        )
        status = "configured"
        mode = "live"
    else:
        label = "Locust watch uses seasonal corridor model only"
        status = "seasonal_fallback"
        mode = "estimate"

    return {
        "status": status,
        "mode": mode,
        "label": label,
        "reachable": custom_feed or fao_enabled,
        "error": None if (custom_feed or fao_enabled) else "feed_disabled",
        "source": source,
        "setup_hint": (
            "Set LOCUST_FEED_URL for a custom feed, or keep FAO locust feed enabled (default)"
            if not custom_feed and not fao_enabled
            else None
        ),
    }


def _bioacoustic_status() -> dict[str, Any]:
    bio = build_bioacoustic_health()
    pipeline = bio.get("pipeline", "stub")
    if bio.get("production_ready"):
        label = (
            "Bioacoustic demo pipeline ready"
            if pipeline == "stub"
            else f"Bioacoustic pipeline ready ({pipeline})"
        )
        return {
            "status": "configured",
            "mode": "live",
            "label": label,
            "reachable": True,
            "error": None,
        }

    missing: list[str] = []
    if pipeline in {"birdnet", "composite", "multitaxa"} and not bio.get("birdnet_available"):
        missing.append("birdnetlib/ffmpeg")
    if settings.bioacoustic_enable_perch and not bio.get("perch_available"):
        missing.append("perch model")

    setup_hint = (
        "Set BIOACOUSTIC_PIPELINE=stub for demo mode without ML, or start the bioacoustic worker "
        "(COMPOSE_PROFILES=bioacoustic docker compose up -d) with INSTALL_BIOACOUSTIC=1"
    )
    return {
        "status": "degraded",
        "mode": "stub",
        "label": (
            f"Bioacoustic ML dependencies missing ({', '.join(missing) or 'worker packages'})"
        ),
        "reachable": False,
        "error": "dependencies_missing",
        "setup_hint": setup_hint,
    }


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
        "ai_analysis": _ai_pipeline_status(),
        "ai_assistant": _assistant_chat_status(),
        "audit_explain": _assistant_chat_status(),
        "tree_satellite_ndvi": _tree_satellite_status(),
        "sentinel_hub": {
            "status": "configured" if sentinel_configured else "not_configured",
            "mode": "live" if sentinel_configured else "estimate",
            "label": (
                "Sentinel Hub credentials configured for plantation scans"
                if sentinel_configured
                else "Sentinel Hub not configured"
            ),
            "reachable": sentinel_configured,
            "error": None if sentinel_configured else "missing_credentials",
        },
        "bhoonidhi": {
            "status": "configured" if bhoonidhi_configured else "not_configured",
            "mode": "live" if bhoonidhi_configured else "estimate",
            "label": (
                "ISRO Bhoonidhi catalog configured"
                if bhoonidhi_configured
                else "Bhoonidhi not configured"
            ),
            "reachable": bhoonidhi_configured,
            "error": None if bhoonidhi_configured else "missing_credentials",
        },
        "iucn": {
            "status": "configured" if iucn_configured else "optional",
            "mode": "live" if iucn_configured else "optional",
            "label": "IUCN Red List API",
            "reachable": iucn_configured,
            "error": None if iucn_configured else "token_optional",
        },
        "firms_fire": {
            "status": "configured" if has_firms_credentials() else "seasonal_fallback",
            "mode": "live" if has_firms_credentials() else "estimate",
            "label": (
                "NASA FIRMS active fire API configured"
                if has_firms_credentials()
                else "Fire watch uses seasonal fallback until FIRMS_MAP_KEY is set"
            ),
            "reachable": has_firms_credentials(),
            "error": None if has_firms_credentials() else "missing_credentials",
            "setup_hint": "Set FIRMS_MAP_KEY in backend environment (free at firms.modaps.eosdis.nasa.gov)",
        },
        "locust_feed": _locust_feed_status(),
        "sar_monitoring": _sar_status(),
        "bioacoustic": _bioacoustic_status(),
    }

    degraded = ping_remote and any(
        v.get("status") == "error" or (v.get("reachable") is False and v.get("status") == "configured")
        for v in integrations.values()
    )
    return {
        "status": "degraded" if degraded else "ok",
        "integrations": integrations,
        "strip": integration_gate_summary(),
    }


async def check_all_integrations() -> dict[str, Any]:
    """Alias used by /health/integrations."""
    return await build_integrations_health()
