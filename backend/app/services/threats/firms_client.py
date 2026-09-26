"""NASA FIRMS active fire detections (VIIRS / MODIS NRT)."""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("threats.firms")

FIRMS_SOURCE = "VIIRS_SNPP_NRT"


@dataclass(frozen=True)
class FireDetection:
    latitude: float
    longitude: float
    confidence: str
    frp: float | None
    acq_date: str
    satellite: str
    brightness: float | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "confidence": self.confidence,
            "frp": self.frp,
            "acq_date": self.acq_date,
            "satellite": self.satellite,
            "brightness": self.brightness,
        }


def has_firms_credentials() -> bool:
    return bool(settings.firms_map_key)


def _parse_firms_csv(text: str) -> list[FireDetection]:
    reader = csv.DictReader(io.StringIO(text))
    out: list[FireDetection] = []
    for row in reader:
        try:
            lat = float(row.get("latitude") or row.get("lat") or 0)
            lon = float(row.get("longitude") or row.get("lon") or 0)
        except (TypeError, ValueError):
            continue
        if lat == 0 and lon == 0:
            continue
        frp_raw = row.get("frp")
        frp = float(frp_raw) if frp_raw not in (None, "") else None
        bright_raw = row.get("bright_t31") or row.get("brightness")
        brightness = float(bright_raw) if bright_raw not in (None, "") else None
        out.append(
            FireDetection(
                latitude=lat,
                longitude=lon,
                confidence=str(row.get("confidence") or "nominal"),
                frp=frp,
                acq_date=str(row.get("acq_date") or row.get("acq_date_acq_time") or ""),
                satellite=str(row.get("satellite") or "VIIRS"),
                brightness=brightness,
            )
        )
    return out


async def fetch_fires_in_bbox(
    west: float,
    south: float,
    east: float,
    north: float,
    *,
    days: int = 1,
) -> list[FireDetection]:
    """Return active fire detections in a WGS84 bbox from NASA FIRMS."""
    if not has_firms_credentials():
        return []

    day_range = max(1, min(days, 10))
    coords = f"{west:.4f},{south:.4f},{east:.4f},{north:.4f}"
    url = (
        f"{settings.firms_api_url.rstrip('/')}/api/area/csv/"
        f"{settings.firms_map_key}/{FIRMS_SOURCE}/{coords}/{day_range}"
    )
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return _parse_firms_csv(resp.text)
    except Exception as exc:
        log.warning("firms.fetch_failed", error=str(exc), bbox=coords)
        return []


async def fetch_fires_near_point(
    latitude: float,
    longitude: float,
    *,
    radius_km: float = 25.0,
    days: int = 1,
) -> list[FireDetection]:
    """Fetch FIRMS detections in a square bbox around a centroid."""
    delta = radius_km / 111.0
    west = longitude - delta
    east = longitude + delta
    south = latitude - delta
    north = latitude + delta
    return await fetch_fires_in_bbox(west, south, east, north, days=days)
