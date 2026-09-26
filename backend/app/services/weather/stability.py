"""Pasquill-Gifford stability classes for Gaussian dispersion."""

from __future__ import annotations

from datetime import datetime


def estimate_stability_class(
    *,
    wind_speed_ms: float,
    temperature_c: float | None,
    weather_code: int | None,
    hour_local: int,
) -> str:
    """Estimate rural Pasquill stability (A–F). Defaults to neutral D."""
    ws = max(wind_speed_ms, 0.5)
    is_day = 6 <= hour_local <= 18
    clear = weather_code in {0, 1, 2, 3} if weather_code is not None else True
    if is_day and clear:
        if ws < 2:
            return "A"
        if ws < 3:
            return "B"
        if ws < 5:
            return "C"
        return "D"
    if not is_day and clear:
        if ws < 2:
            return "F"
        if ws < 3:
            return "E"
        return "D"
    if temperature_c is not None and temperature_c > 30 and ws < 3:
        return "B"
    return "D"


def sigma_y_m(distance_m: float, stability: str) -> float:
    x = max(distance_m, 1.0)
    coeffs: dict[str, tuple[float, float, float]] = {
        "A": (0.22, 0.0001, 0.5),
        "B": (0.16, 0.0001, 0.5),
        "C": (0.11, 0.0001, 0.5),
        "D": (0.08, 0.0001, 0.5),
        "E": (0.06, 0.0001, 0.5),
        "F": (0.04, 0.0001, 0.5),
    }
    a, b, c = coeffs.get(stability, coeffs["D"])
    return a * x * (1 + b * x) ** (-c)


def sigma_z_m(distance_m: float, stability: str) -> float:
    x = max(distance_m, 1.0)
    coeffs: dict[str, tuple[float, float, float]] = {
        "A": (0.20, 0.0, 0.0),
        "B": (0.12, 0.0, 0.0),
        "C": (0.08, 0.0002, 1.0),
        "D": (0.06, 0.0015, 1.0),
        "E": (0.03, 0.0003, 1.0),
        "F": (0.016, 0.0003, 1.0),
    }
    a, b, c = coeffs.get(stability, coeffs["D"])
    if c == 0.0:
        return a * x
    return a * x * (1 + b * x) ** (-c)


def hour_from_iso(iso_time: datetime) -> int:
    return iso_time.hour
