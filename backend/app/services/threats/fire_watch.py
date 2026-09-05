"""Active fire proximity watch using NASA FIRMS (with seasonal fallback)."""

from __future__ import annotations

import math
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings
from app.services.monitoring.mgrs import haversine_km
from app.services.threats.firms_client import (
    FireDetection,
    fetch_fires_near_point,
    has_firms_credentials,
)

# Peak forest-fire months in India (1-indexed)
_FIRE_SEASON_MONTHS = {3, 4, 5, 10, 11, 12}


def _confidence_rank(confidence: str) -> int:
    c = (confidence or "").lower()
    if c in ("high", "h"):
        return 3
    if c in ("nominal", "n"):
        return 2
    return 1


def _nearest_fire(
    latitude: float,
    longitude: float,
    fires: list[FireDetection],
) -> tuple[FireDetection | None, float]:
    nearest: FireDetection | None = None
    nearest_km = float("inf")
    for fire in fires:
        dist = haversine_km(latitude, longitude, fire.latitude, fire.longitude)
        if dist < nearest_km:
            nearest_km = dist
            nearest = fire
    return nearest, nearest_km


def _seasonal_fire_watch(latitude: float, longitude: float, *, now: datetime | None = None) -> dict[str, Any] | None:
    """Heuristic when FIRMS credentials are not configured."""
    now = now or datetime.now(UTC)
    if now.month not in _FIRE_SEASON_MONTHS:
        return None
    # Dry deciduous / scrub risk belt — coarse regional signal only
    if 8.0 <= latitude <= 35.0 and 68.0 <= longitude <= 92.0:
        return {
            "kind": "fire",
            "severity": "info",
            "title": "Forest fire season watch",
            "message": (
                "Peak fire season in this region. Monitor FIRMS/NASA fire maps and district "
                "forest alerts; patrol plantation perimeters after dry spells."
            ),
            "source": "seasonal_model",
            "distance_km": None,
            "fire_count": 0,
        }
    return None


async def assess_fire_proximity(
    latitude: float,
    longitude: float,
    *,
    radius_km: float | None = None,
    days: int = 1,
) -> dict[str, Any]:
    """Assess active fire risk near a work-area centroid."""
    radius = radius_km or settings.hazard_fire_radius_km
    fires = await fetch_fires_near_point(latitude, longitude, radius_km=radius, days=days)

    if not fires:
        seasonal = None if has_firms_credentials() else _seasonal_fire_watch(latitude, longitude)
        return {
            "risk_level": "none",
            "fire_count": 0,
            "nearest_km": None,
            "nearest_fire": None,
            "source": "firms" if has_firms_credentials() else "seasonal_fallback",
            "early_warning": seasonal,
        }

    nearest, nearest_km = _nearest_fire(latitude, longitude, fires)
    high_conf = [f for f in fires if _confidence_rank(f.confidence) >= 2]
    risk = "none"
    severity = "info"
    if nearest_km <= 5 and high_conf:
        risk = "critical"
        severity = "critical"
    elif nearest_km <= 15:
        risk = "high"
        severity = "warning"
    elif nearest_km <= radius:
        risk = "watch"
        severity = "info"

    early_warning = None
    if risk != "none" and nearest is not None:
        frp_txt = f" (FRP {nearest.frp:.0f} MW)" if nearest.frp else ""
        early_warning = {
            "kind": "fire",
            "severity": severity,
            "title": "Active fire detected nearby",
            "message": (
                f"{len(fires)} satellite fire detection(s) within {radius:.0f} km; "
                f"nearest ~{nearest_km:.1f} km{frp_txt}. "
                "Patrol plantation edges and verify smoke or burn scars on the ground."
            ),
            "source": "firms",
            "distance_km": round(nearest_km, 1),
            "fire_count": len(fires),
            "nearest_fire": nearest.as_dict(),
        }

    return {
        "risk_level": risk,
        "fire_count": len(fires),
        "nearest_km": round(nearest_km, 1) if math.isfinite(nearest_km) else None,
        "nearest_fire": nearest.as_dict() if nearest else None,
        "source": "firms",
        "early_warning": early_warning,
    }
