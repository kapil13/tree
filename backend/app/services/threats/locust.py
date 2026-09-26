"""Regional locust and migratory pest early-warning heuristics.

Uses seasonal migration corridors for South Asia. Replace with FAO DLIS or national
agriculture API feed when available.
"""

from __future__ import annotations

import math
from datetime import UTC, datetime
from typing import Any

# Historical locust breeding / migration reference points (lat, lon, label)
_LOCUST_CORRIDORS: list[tuple[float, float, str]] = [
    (26.92, 70.90, "Thar Desert (Rajasthan)"),
    (28.02, 73.31, "Bikaner corridor"),
    (23.73, 69.70, "Kutch (Gujarat)"),
    (24.58, 73.69, "Udaipur belt"),
    (29.39, 71.68, "Punjab border belt"),
    (25.45, 78.57, "Bundelkhand"),
]

# Peak locust activity months in India (1-indexed)
_PEAK_MONTHS = {6, 7, 8}
_ACTIVE_MONTHS = {5, 6, 7, 8, 9, 10, 11}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def assess_locust_risk(latitude: float, longitude: float, *, now: datetime | None = None) -> dict[str, Any]:
    """Return locust watch level for a plantation centroid."""
    now = now or datetime.now(UTC)
    month = now.month

    nearest_km = float("inf")
    nearest_label = ""
    for clat, clon, label in _LOCUST_CORRIDORS:
        dist = _haversine_km(latitude, longitude, clat, clon)
        if dist < nearest_km:
            nearest_km = dist
            nearest_label = label

    if month not in _ACTIVE_MONTHS:
        return {
            "risk_level": "none",
            "nearest_corridor_km": round(nearest_km, 1),
            "nearest_corridor": nearest_label,
            "season_active": False,
            "message": "Locust migration season inactive for this month.",
        }

    risk = "none"
    message = "No locust corridor proximity signal at this location."

    if month in _PEAK_MONTHS:
        if nearest_km <= 150:
            risk = "warning"
            message = (
                f"Peak locust season — site is ~{nearest_km:.0f} km from {nearest_label}. "
                "Scout daily; report hopper bands to district agriculture office."
            )
        elif nearest_km <= 400:
            risk = "watch"
            message = (
                f"Peak locust season — ~{nearest_km:.0f} km from {nearest_label}. "
                "Monitor FAO/india locust bulletins and yellow trap counts."
            )
    else:
        if nearest_km <= 100:
            risk = "watch"
            message = (
                f"Locust season active — ~{nearest_km:.0f} km from {nearest_label}. "
                "Maintain early-warning traps on plantation perimeter."
            )

    return {
        "risk_level": risk,
        "nearest_corridor_km": round(nearest_km, 1),
        "nearest_corridor": nearest_label,
        "season_active": True,
        "message": message,
    }


def locust_early_warning(latitude: float, longitude: float) -> dict[str, Any] | None:
    """Return an early-warning dict when locust risk is elevated."""
    assessment = assess_locust_risk(latitude, longitude)
    level = assessment["risk_level"]
    if level == "none":
        return None
    return {
        "kind": "locust",
        "severity": "critical" if level == "warning" else "warning",
        "title": "Locust migration watch",
        "message": assessment["message"],
        "source": "seasonal_model",
        "distance_km": assessment["nearest_corridor_km"],
        "corridor": assessment["nearest_corridor"],
    }
