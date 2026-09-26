"""Stability class estimation tests."""

from __future__ import annotations

from app.services.weather.stability import estimate_stability_class, sigma_y_m, sigma_z_m


def test_stability_neutral_default():
    assert estimate_stability_class(
        wind_speed_ms=5.0,
        temperature_c=20.0,
        weather_code=61,
        hour_local=14,
    ) == "D"


def test_stability_night_stable():
    assert estimate_stability_class(
        wind_speed_ms=1.5,
        temperature_c=15.0,
        weather_code=0,
        hour_local=2,
    ) == "F"


def test_sigma_increases_downwind():
    assert sigma_y_m(1000, "D") < sigma_y_m(5000, "D")
    assert sigma_z_m(1000, "D") < sigma_z_m(5000, "D")
