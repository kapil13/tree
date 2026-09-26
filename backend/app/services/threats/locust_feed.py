"""FAO / configurable locust observation feed with seasonal fallback."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.services.threats.locust import _haversine_km, assess_locust_risk

log = get_logger("threats.locust_feed")

_CACHE_TTL_SECONDS = 6 * 60 * 60
_CACHE: dict[str, Any] = {"expires_at": 0.0, "observations": []}


@dataclass(frozen=True)
class LocustObservation:
    latitude: float
    longitude: float
    category: str
    location_name: str
    start_date: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "category": self.category,
            "location_name": self.location_name,
            "start_date": self.start_date,
        }


def has_locust_feed() -> bool:
    return bool(settings.locust_feed_url)


def _parse_observations(payload: Any) -> list[LocustObservation]:
    rows: list[Any]
    if isinstance(payload, list):
        rows = payload
    elif isinstance(payload, dict):
        rows = payload.get("observations") or payload.get("items") or payload.get("data") or []
    else:
        return []

    out: list[LocustObservation] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        try:
            lat = float(row.get("lat") or row.get("latitude") or 0)
            lon = float(row.get("lon") or row.get("longitude") or 0)
        except (TypeError, ValueError):
            continue
        if lat == 0 and lon == 0:
            continue
        out.append(
            LocustObservation(
                latitude=lat,
                longitude=lon,
                category=str(row.get("category") or row.get("type") or "observation"),
                location_name=str(row.get("location_name") or row.get("location") or "FAO observation"),
                start_date=str(row.get("start_date") or row.get("date") or "") or None,
            )
        )
    return out


async def _fetch_fao_observations() -> list[LocustObservation]:
    """Best-effort FAO DLIS BigQuery feed; returns [] when unavailable."""
    query = (
        "SELECT lat, lon, start_date, location_name "
        "FROM `fao-maps-review.fao_locusts.Swarm_last_month` "
        "WHERE lat BETWEEN 6 AND 37 AND lon BETWEEN 68 AND 97 "
        "LIMIT 200"
    )
    url = f"{settings.fao_locust_api_url.rstrip('/')}/api/v2/bigquery"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, params={"query": query})
            if resp.status_code != 200:
                return []
            payload = resp.json()
            if isinstance(payload, dict) and payload.get("detail"):
                return []
            return _parse_observations(payload)
    except Exception as exc:
        log.warning("locust_feed.fao_failed", error=str(exc))
        return []


async def _fetch_configured_feed() -> list[LocustObservation]:
    if not settings.locust_feed_url:
        return []
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(settings.locust_feed_url)
            resp.raise_for_status()
            return _parse_observations(resp.json())
    except Exception as exc:
        log.warning("locust_feed.configured_failed", error=str(exc), url=settings.locust_feed_url)
        return []


async def fetch_locust_observations(*, force_refresh: bool = False) -> list[LocustObservation]:
    """Return cached locust observations from configured or FAO feed."""
    now = time.time()
    if not force_refresh and _CACHE["expires_at"] > now:
        return list(_CACHE["observations"])

    observations = await _fetch_configured_feed()
    source = "configured_feed" if observations else ""
    if not observations and settings.fao_locust_feed_enabled:
        observations = await _fetch_fao_observations()
        source = "fao_feed" if observations else ""

    _CACHE["expires_at"] = now + _CACHE_TTL_SECONDS
    _CACHE["observations"] = observations
    _CACHE["source"] = source or "seasonal_model"
    return observations


def locust_feed_source() -> str:
    if has_locust_feed():
        return "configured_feed"
    if settings.fao_locust_feed_enabled and _CACHE.get("observations"):
        return "fao_feed"
    if settings.fao_locust_feed_enabled:
        return "fao_feed_attempted"
    return "seasonal_model"


def assess_locust_with_feed(
    latitude: float,
    longitude: float,
    observations: list[LocustObservation],
    *,
    radius_km: float | None = None,
) -> dict[str, Any]:
    """Assess locust risk using live observations, else corridor heuristics."""
    radius = radius_km or settings.locust_feed_radius_km
    if observations:
        nearest_km = float("inf")
        nearest: LocustObservation | None = None
        nearby = 0
        for obs in observations:
            dist = _haversine_km(latitude, longitude, obs.latitude, obs.longitude)
            if dist <= radius:
                nearby += 1
            if dist < nearest_km:
                nearest_km = dist
                nearest = obs

        if nearest is not None and nearest_km <= radius:
            risk = "warning" if nearest_km <= 75 else "watch"
            return {
                "risk_level": risk,
                "nearest_corridor_km": round(nearest_km, 1),
                "nearest_corridor": nearest.location_name,
                "season_active": True,
                "observation_count": nearby,
                "source": locust_feed_source(),
                "message": (
                    f"{nearby} FAO locust observation(s) within {radius:.0f} km; "
                    f"nearest ~{nearest_km:.0f} km ({nearest.location_name}). "
                    "Scout plantation perimeter and monitor district agriculture bulletins."
                ),
            }

    fallback = assess_locust_risk(latitude, longitude)
    fallback["source"] = "seasonal_model"
    fallback["observation_count"] = 0
    return fallback


async def locust_early_warning_with_feed(latitude: float, longitude: float) -> dict[str, Any] | None:
    """Return locust early warning using feed when available."""
    observations = await fetch_locust_observations()
    assessment = assess_locust_with_feed(latitude, longitude, observations)
    level = assessment["risk_level"]
    if level == "none":
        return None
    source = assessment.get("source") or "seasonal_model"
    title = "Locust migration watch"
    if source in ("configured_feed", "fao_feed"):
        title = "FAO locust observation nearby"
    return {
        "kind": "locust",
        "severity": "critical" if level == "warning" else "warning",
        "title": title,
        "message": assessment["message"],
        "source": source,
        "distance_km": assessment["nearest_corridor_km"],
        "corridor": assessment["nearest_corridor"],
        "observation_count": assessment.get("observation_count", 0),
    }
