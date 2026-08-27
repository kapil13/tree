"""Tests for plain-language alert interpreter."""

from app.services.alerts.interpreter import (
    build_site_preparedness_brief,
    interpret_alert,
    interpret_emission_fusion,
    interpret_weather_subkind,
)


def test_weather_heavy_rain_preparedness():
    brief = interpret_weather_subkind(
        "heavy_rain",
        severity="critical",
        payload={"work_area_name": "Block A", "date": "2026-07-18", "precipitation_mm": 80},
        message="",
    )
    assert "Block A" in brief["headline"]
    assert brief["urgency"] == "today"
    assert len(brief["prepare"]) >= 2
    assert brief["category"] == "weather"


def test_methane_misaligned_preparedness():
    brief = interpret_emission_fusion(
        verdict="misaligned",
        anomaly_ppb=18.5,
        alignment_score=42.0,
        work_area_name="North belt",
    )
    assert "methane" in brief["meaning"].lower()
    assert brief["category"] == "methane"
    assert any("emissions" in step.lower() for step in brief["prepare"])


def test_inbox_weather_kind_prefix():
    brief = interpret_alert(
        kind="weather_thunderstorm",
        severity="warning",
        title="Thunderstorm expected — Site 1",
        message="Delay spraying.",
        payload={"work_area_name": "Site 1", "date": "2026-08-01"},
    )
    assert brief["category"] == "weather"
    assert "spray" in " ".join(brief["prepare"]).lower() or "spray" in brief["meaning"].lower()


def test_site_preparedness_picks_weather_first():
    site = {
        "work_area_name": "Green belt",
        "composite_risk": "moderate",
        "rain_mm_next_48h": 10,
        "weather_alerts": [
            {
                "kind": "heavy_rain",
                "severity": "critical",
                "title": "Extreme rainfall",
                "message": "80 mm rain",
                "date": "2026-07-20",
                "precipitation_mm": 80,
            }
        ],
        "early_warnings": [],
        "recommended_actions": ["Check drains"],
    }
    brief = build_site_preparedness_brief(site)
    assert "rain" in brief["headline"].lower()
    assert "Check drains" in brief["prepare"]
