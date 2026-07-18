"""Tests for weather alerts, locust risk, and threat watch."""

from __future__ import annotations

from datetime import UTC, datetime

from app.schemas.weather import DailyForecast, WeatherForecast
from app.services.threats.locust import assess_locust_risk
from app.services.weather.alerts import evaluate_day_alerts, evaluate_weather_alerts


def test_evaluate_day_alerts_heavy_rain():
    day = DailyForecast(
        date=datetime(2026, 7, 18, tzinfo=UTC).date(),
        weather_code=65,
        description="Heavy rain",
        temp_min_c=22.0,
        temp_max_c=28.0,
        precipitation_mm=80.0,
        wind_max_kmh=30.0,
    )
    alerts = evaluate_day_alerts(day)
    kinds = {a["kind"] for a in alerts}
    assert "heavy_rain" in kinds
    assert any(a["severity"] == "critical" for a in alerts if a["kind"] == "heavy_rain")


def test_evaluate_weather_alerts_storm():
    forecast = WeatherForecast(
        latitude=12.97,
        longitude=77.59,
        timezone="Asia/Kolkata",
        days=[
            DailyForecast(
                date=datetime(2026, 7, 18, tzinfo=UTC).date(),
                weather_code=95,
                description="Thunderstorm",
                temp_min_c=22.0,
                temp_max_c=30.0,
                precipitation_mm=12.0,
                wind_max_kmh=40.0,
            )
        ],
    )
    alerts = evaluate_weather_alerts(forecast)
    assert any(a["kind"] == "thunderstorm" for a in alerts)


def test_locust_risk_peak_season_near_corridor():
    # Near Jaisalmer in July
    result = assess_locust_risk(27.0, 71.0, now=datetime(2026, 7, 15, tzinfo=UTC))
    assert result["season_active"] is True
    assert result["risk_level"] in ("watch", "warning")
    assert result["nearest_corridor_km"] < 200


def test_locust_risk_off_season():
    result = assess_locust_risk(12.97, 77.59, now=datetime(2026, 1, 15, tzinfo=UTC))
    assert result["risk_level"] == "none"
    assert result["season_active"] is False
