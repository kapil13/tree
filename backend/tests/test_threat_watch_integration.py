"""Integration-style threat watch scenarios with mocked external services."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.threats.watch import build_portfolio_threat_watch, build_site_threat_watch


def _minimal_site(fence, project=None, *, fire_warning=None, weather=None):
    return {
        "work_area_id": str(fence.id),
        "work_area_name": fence.name,
        "project_id": str(fence.project_id) if fence.project_id else None,
        "project_name": project.name if project else None,
        "latitude": 26.9,
        "longitude": 75.8,
        "composite_risk": "high" if fire_warning else "low",
        "pest_control_needed": False,
        "disease_control_needed": False,
        "rain_mm_next_48h": 0,
        "ndvi_trend": None,
        "healthy_pct": None,
        "tree_count": 0,
        "weather_alerts": [],
        "early_warnings": [fire_warning] if fire_warning else [],
        "fire_watch": {
            "risk_level": "watch" if fire_warning else "none",
            "fire_count": 1 if fire_warning else 0,
            "nearest_km": 8.0 if fire_warning else None,
            "source": "firms" if fire_warning else None,
        },
        "flood_extent_watch": {
            "risk_level": "none",
            "water_extent_score": None,
            "delta_score": None,
            "rain_mm_48h": 0,
        },
        "forecast_summary": "Forecast unavailable." if weather is None else "Next: Clear, 22–30°C, 0 mm rain.",
        "recommended_actions": [],
        "preparedness_brief": None,
    }


@pytest.mark.asyncio
async def test_site_threat_watch_with_active_fire_nearby():
    fence = MagicMock()
    fence.id = uuid.uuid4()
    fence.name = "Fire line block"
    fence.project_id = None
    fence.boundary = None

    fire_warning = {
        "kind": "fire",
        "severity": "warning",
        "title": "Active fire detected nearby",
        "message": "Nearest ~8 km",
        "source": "firms",
        "distance_km": 8.0,
    }

    db = AsyncMock()
    intel = {
        "composite_risk": "high",
        "pest_control_needed": False,
        "disease_control_needed": False,
        "rain_mm_next_48h": 0,
        "ndvi_trend": None,
        "early_warnings": [],
        "recommended_actions": [],
        "weather": {
            "latitude": 26.9,
            "longitude": 75.8,
            "timezone": "UTC",
            "days": [
                {
                    "date": "2026-07-18",
                    "weather_code": 0,
                    "description": "Clear",
                    "temp_min_c": 22.0,
                    "temp_max_c": 30.0,
                    "precipitation_mm": 0.0,
                    "wind_max_kmh": 10.0,
                }
            ],
        },
    }

    with (
        patch(
            "app.services.threats.watch.geography_to_geojson_polygon",
            return_value={"type": "Polygon", "coordinates": [[[75.8, 26.9], [75.81, 26.9], [75.81, 26.91], [75.8, 26.91], [75.8, 26.9]]]},
        ),
        patch("app.services.threats.watch.polygon_centroid", return_value=(26.9, 75.8)),
        patch("app.services.threats.watch.build_pest_intel", AsyncMock(return_value=intel)),
        patch(
            "app.services.threats.watch.assess_fire_proximity",
            AsyncMock(return_value={"risk_level": "watch", "fire_count": 1, "nearest_km": 8.0, "source": "firms", "early_warning": fire_warning}),
        ),
        patch(
            "app.services.threats.watch.assess_fence_flood_extent",
            AsyncMock(return_value={"risk_level": "none"}),
        ),
        patch("app.services.threats.watch.build_site_preparedness_brief", return_value=None),
    ):
        site = await build_site_threat_watch(db, fence=fence, project=None)

    assert any(w.get("kind") == "fire" for w in site["early_warnings"])
    assert site["fire_watch"]["risk_level"] == "watch"


@pytest.mark.asyncio
async def test_site_threat_watch_with_missing_weather_data():
    fence = MagicMock()
    fence.id = uuid.uuid4()
    fence.name = "Dry block"
    fence.project_id = None
    fence.boundary = None

    db = AsyncMock()
    intel = {
        "composite_risk": "low",
        "pest_control_needed": False,
        "disease_control_needed": False,
        "rain_mm_next_48h": 0,
        "ndvi_trend": None,
        "early_warnings": [],
        "recommended_actions": ["Continue routine monitoring."],
        "weather": None,
    }

    with (
        patch(
            "app.services.threats.watch.geography_to_geojson_polygon",
            return_value={"type": "Polygon", "coordinates": [[[75.8, 26.9], [75.81, 26.9], [75.81, 26.91], [75.8, 26.91], [75.8, 26.9]]]},
        ),
        patch("app.services.threats.watch.polygon_centroid", return_value=(26.9, 75.8)),
        patch("app.services.threats.watch.build_pest_intel", AsyncMock(return_value=intel)),
        patch(
            "app.services.threats.watch.assess_fire_proximity",
            AsyncMock(return_value={"risk_level": "none", "fire_count": 0, "nearest_km": None, "source": None}),
        ),
        patch(
            "app.services.threats.watch.assess_fence_flood_extent",
            AsyncMock(return_value={"risk_level": "none"}),
        ),
        patch("app.services.threats.watch.build_site_preparedness_brief", return_value=None),
    ):
        site = await build_site_threat_watch(db, fence=fence, project=None)

    assert site["forecast_summary"] == "Forecast unavailable."
    assert site["composite_risk"] == "low"


@pytest.mark.asyncio
async def test_portfolio_threat_watch_many_fences():
    fences = []
    for idx in range(5):
        fence = MagicMock()
        fence.id = uuid.uuid4()
        fence.name = f"Block {idx}"
        fence.project_id = None
        fence.created_at = None
        fences.append(fence)

    user = MagicMock()
    db = AsyncMock()
    fences_result = MagicMock()
    fences_result.scalars.return_value.all.return_value = fences
    db.execute = AsyncMock(return_value=fences_result)

    async def fake_site(db, *, fence, project=None, weather_days=5):
        return _minimal_site(fence, project)

    with patch(
        "app.services.threats.watch.build_site_threat_watch",
        side_effect=fake_site,
    ):
        result = await build_portfolio_threat_watch(db, user=user, limit=12, use_cache=False)

    assert result["summary"]["sites_requested"] == 5
    assert result["summary"]["sites_monitored"] == 5
    assert result["summary"]["sites_failed"] == 0
    assert len(result["sites"]) == 5
