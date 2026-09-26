"""Location-specific weather alert rules for plantation work areas."""

from __future__ import annotations

from typing import Any

from app.schemas.weather import DailyForecast, WeatherForecast

RISK_ORDER = {"info": 0, "warning": 1, "critical": 2}


def _max_severity(current: str, new: str) -> str:
    return new if RISK_ORDER.get(new, 0) > RISK_ORDER.get(current, 0) else current


def evaluate_day_alerts(day: DailyForecast) -> list[dict[str, Any]]:
    """Return weather alerts for a single forecast day at a plantation centroid."""
    alerts: list[dict[str, Any]] = []
    date_str = day.date.isoformat()

    if day.precipitation_mm >= 75:
        alerts.append(
            {
                "kind": "heavy_rain",
                "severity": "critical",
                "title": "Extreme rainfall expected",
                "message": (
                    f"Heavy rain forecast ({day.precipitation_mm:.0f} mm) on {date_str}. "
                    "Check pit drainage, sapling guards, and erosion on slopes."
                ),
                "date": date_str,
                "precipitation_mm": day.precipitation_mm,
            }
        )
    elif day.precipitation_mm >= 35:
        alerts.append(
            {
                "kind": "heavy_rain",
                "severity": "warning",
                "title": "Heavy rain expected",
                "message": (
                    f"Rain forecast ({day.precipitation_mm:.0f} mm) on {date_str}. "
                    "Monitor waterlogging and fungal disease risk in young plantations."
                ),
                "date": date_str,
                "precipitation_mm": day.precipitation_mm,
            }
        )
    elif day.precipitation_mm >= 15:
        alerts.append(
            {
                "kind": "rain",
                "severity": "info",
                "title": "Rain expected",
                "message": (
                    f"Moderate rain ({day.precipitation_mm:.0f} mm) on {date_str}. "
                    "Good for establishment; watch for pest flare-ups after wet spells."
                ),
                "date": date_str,
                "precipitation_mm": day.precipitation_mm,
            }
        )

    if day.weather_code in (96, 99):
        alerts.append(
            {
                "kind": "hail_storm",
                "severity": "critical",
                "title": "Hailstorm risk",
                "message": (
                    f"Hail-bearing thunderstorm forecast on {date_str}. "
                    "Protect nursery stock and inspect saplings after the event."
                ),
                "date": date_str,
                "weather_code": day.weather_code,
            }
        )
    elif day.weather_code >= 95:
        alerts.append(
            {
                "kind": "thunderstorm",
                "severity": "warning",
                "title": "Thunderstorm expected",
                "message": (
                    f"Thunderstorm forecast on {date_str}. "
                    "Delay spraying; secure loose mulch and tree guards."
                ),
                "date": date_str,
                "weather_code": day.weather_code,
            }
        )

    if day.temp_max_c >= 45:
        alerts.append(
            {
                "kind": "heat_stress",
                "severity": "critical",
                "title": "Extreme heat stress",
                "message": (
                    f"Peak temperature {day.temp_max_c:.0f}°C on {date_str}. "
                    "Increase irrigation checks; heat stress raises pest and mortality risk."
                ),
                "date": date_str,
                "temp_max_c": day.temp_max_c,
            }
        )
    elif day.temp_max_c >= 40:
        alerts.append(
            {
                "kind": "heat_stress",
                "severity": "warning",
                "title": "High heat expected",
                "message": (
                    f"Peak temperature {day.temp_max_c:.0f}°C on {date_str}. "
                    "Schedule watering early morning; watch for wilting saplings."
                ),
                "date": date_str,
                "temp_max_c": day.temp_max_c,
            }
        )

    if day.wind_max_kmh is not None and day.wind_max_kmh >= 70:
        alerts.append(
            {
                "kind": "high_wind",
                "severity": "critical",
                "title": "Damaging wind expected",
                "message": (
                    f"Wind gusts up to {day.wind_max_kmh:.0f} km/h on {date_str}. "
                    "Stake young trees and inspect guards after the event."
                ),
                "date": date_str,
                "wind_max_kmh": day.wind_max_kmh,
            }
        )
    elif day.wind_max_kmh is not None and day.wind_max_kmh >= 50:
        alerts.append(
            {
                "kind": "high_wind",
                "severity": "warning",
                "title": "Strong wind expected",
                "message": (
                    f"Wind up to {day.wind_max_kmh:.0f} km/h on {date_str}. "
                    "Check staking on recently planted rows."
                ),
                "date": date_str,
                "wind_max_kmh": day.wind_max_kmh,
            }
        )

    if day.temp_min_c <= 2:
        alerts.append(
            {
                "kind": "frost",
                "severity": "warning",
                "title": "Frost risk",
                "message": (
                    f"Overnight low {day.temp_min_c:.0f}°C on {date_str}. "
                    "Protect sensitive species and nursery stock."
                ),
                "date": date_str,
                "temp_min_c": day.temp_min_c,
            }
        )

    return alerts


def evaluate_weather_alerts(forecast: WeatherForecast, *, days: int = 5) -> list[dict[str, Any]]:
    """Aggregate weather alerts for the next N days at a plantation location."""
    merged: dict[tuple[str, str], dict[str, Any]] = {}
    for day in (forecast.days or [])[:days]:
        for alert in evaluate_day_alerts(day):
            key = (alert["kind"], alert.get("date", ""))
            if key in merged:
                merged[key]["severity"] = _max_severity(merged[key]["severity"], alert["severity"])
            else:
                merged[key] = dict(alert)
    return sorted(
        merged.values(),
        key=lambda a: (RISK_ORDER.get(a["severity"], 0), a.get("date", "")),
        reverse=True,
    )


def weather_alert_summary(alerts: list[dict[str, Any]]) -> str:
    if not alerts:
        return "No significant weather risks in the next 5 days."
    top = alerts[0]
    return top.get("message", top.get("title", "Weather alert active"))
