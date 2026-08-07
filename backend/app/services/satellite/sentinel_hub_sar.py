"""Copernicus Sentinel Hub Sentinel-1 SAR sampling (C-band VH/VV)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from app.core.config import settings
from app.core.logging import get_logger
from app.services.satellite.plantation import has_sentinel_credentials

log = get_logger(__name__)

PIPELINE = "byot-sar-sentinel-hub-s1-2.0.0"
PROVIDER = "sar-sentinel-hub-s1"


def _sentinel_client():
    from app.services.satellite.sentinel_hub import SentinelHubClient

    return SentinelHubClient(
        settings.sentinel_hub_client_id or "",
        settings.sentinel_hub_client_secret or "",
        api_base_url=settings.sentinel_hub_api_url,
        token_url=settings.sentinel_hub_token_url,
    )


def sentinel_hub_sar_configured() -> bool:
    return has_sentinel_credentials()


def _build_sample_dict(
    *,
    acquired: datetime,
    vh_db: float,
    vv_db: float,
    lat: float,
    lon: float,
) -> dict[str, Any]:
    l_proxy = vh_db
    s_proxy = vv_db
    l_s_ratio = l_proxy - s_proxy
    double_bounce = round(min(1.0, max(0.0, (l_s_ratio + 5) / 12.0)), 3)
    ground_moisture = round(min(1.0, double_bounce * 0.65 + 0.15), 3)
    wetland_prob = round(min(1.0, double_bounce * 0.5 + ground_moisture * 0.35), 3)
    scene_id = f"S1_SH_{acquired.strftime('%Y%m%d')}_{abs(int(lat * 1000))}_{abs(int(lon * 1000))}"

    return {
        "provider": PROVIDER,
        "scene_id": scene_id[:250],
        "scene_acquired_at": acquired,
        "l_band_hh_db": l_proxy,
        "s_band_hh_db": s_proxy,
        "vh_hv_ratio": None,
        "double_bounce_index": double_bounce,
        "wetland_probability": wetland_prob,
        "ground_moisture_index": ground_moisture,
        "canopy_ground_mismatch": wetland_prob >= 0.5 and l_s_ratio >= 2.5,
        "frequency_bands": ["C"],
        "polarimetric_composite": {"vh_db": vh_db, "vv_db": vv_db},
        "coherence": None,
        "pipeline": PIPELINE,
    }


async def sample_sentinel1_point_sh(
    lat: float, lon: float, *, when: datetime | None = None
) -> dict[str, Any] | None:
    if not sentinel_hub_sar_configured():
        return None
    try:
        result = await _sentinel_client().fetch_s1_point_sample(lat, lon, when=when)
        if result is None:
            return None
        acquired, vh_db, vv_db = result
        return _build_sample_dict(acquired=acquired, vh_db=vh_db, vv_db=vv_db, lat=lat, lon=lon)
    except Exception as exc:
        log.warning("sentinel_hub_s1_sample_failed", lat=lat, lon=lon, error=str(exc))
        return None
