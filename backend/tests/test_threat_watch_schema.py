"""Threat watch API schema exposes fire/flood summary fields."""

from __future__ import annotations

from app.schemas.threat_watch import ThreatWatchResponse


def test_threat_watch_response_includes_fire_flood_summary():
    data = {
        "generated_at": "2026-09-12T00:00:00+00:00",
        "summary": {
            "sites_monitored": 2,
            "weather_alerts_count": 1,
            "pest_high_count": 0,
            "locust_watch_count": 0,
            "fire_watch_count": 1,
            "flood_extent_watch_count": 1,
            "highest_risk": "high",
        },
        "sites": [
            {
                "work_area_id": "wa-1",
                "work_area_name": "Block A",
                "latitude": 26.9,
                "longitude": 75.8,
                "composite_risk": "high",
                "fire_watch": {
                    "risk_level": "watch",
                    "fire_count": 2,
                    "nearest_km": 12.4,
                    "source": "firms",
                },
                "flood_extent_watch": {
                    "risk_level": "moderate",
                    "water_extent_score": 0.62,
                    "delta_score": 0.11,
                    "rain_mm_48h": 40.0,
                },
                "early_warnings": [
                    {
                        "kind": "fire",
                        "severity": "warning",
                        "title": "Active fire detected nearby",
                        "message": "Nearest ~12 km",
                        "source": "firms",
                        "distance_km": 12.4,
                    }
                ],
            }
        ],
    }
    parsed = ThreatWatchResponse.model_validate(data)
    assert parsed.summary.fire_watch_count == 1
    assert parsed.summary.flood_extent_watch_count == 1
    assert parsed.sites[0].fire_watch is not None
    assert parsed.sites[0].fire_watch.risk_level == "watch"
    assert parsed.sites[0].flood_extent_watch is not None
