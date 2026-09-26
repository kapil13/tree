"""Portfolio threat watch resilience tests."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.threats.watch import build_portfolio_threat_watch


@pytest.mark.asyncio
async def test_portfolio_threat_watch_records_failures():
    fence_ok = MagicMock()
    fence_ok.id = uuid.uuid4()
    fence_ok.name = "Block A"
    fence_ok.project_id = None
    fence_ok.created_at = None

    fence_bad = MagicMock()
    fence_bad.id = uuid.uuid4()
    fence_bad.name = "Block B"
    fence_bad.project_id = None
    fence_bad.created_at = None

    user = MagicMock()

    db = AsyncMock()
    fences_result = MagicMock()
    fences_result.scalars.return_value.all.return_value = [fence_ok, fence_bad]
    db.execute = AsyncMock(return_value=fences_result)

    async def fake_site(db, *, fence, project=None, weather_days=5):
        if fence.name == "Block B":
            raise RuntimeError("weather provider down")
        return {
            "work_area_id": str(fence.id),
            "work_area_name": fence.name,
            "project_id": None,
            "project_name": None,
            "latitude": 12.9,
            "longitude": 77.5,
            "composite_risk": "low",
            "pest_control_needed": False,
            "disease_control_needed": False,
            "rain_mm_next_48h": 0,
            "ndvi_trend": None,
            "healthy_pct": None,
            "tree_count": 0,
            "weather_alerts": [],
            "early_warnings": [],
            "fire_watch": {"risk_level": "none", "fire_count": 0, "nearest_km": None, "source": None},
            "flood_extent_watch": {
                "risk_level": "none",
                "water_extent_score": None,
                "delta_score": None,
                "rain_mm_48h": 0,
            },
            "forecast_summary": "Forecast unavailable.",
            "recommended_actions": [],
            "preparedness_brief": None,
        }

    with patch(
        "app.services.threats.watch.build_site_threat_watch",
        side_effect=fake_site,
    ):
        result = await build_portfolio_threat_watch(db, user=user, limit=12, use_cache=False)

    assert result["summary"]["sites_requested"] == 2
    assert result["summary"]["sites_monitored"] == 1
    assert result["summary"]["sites_failed"] == 1
    assert len(result["failures"]) == 1
    assert result["failures"][0]["work_area_name"] == "Block B"
    assert "weather provider down" in result["failures"][0]["error"]


@pytest.mark.asyncio
async def test_portfolio_threat_watch_batches_project_lookup():
    project_id = uuid.uuid4()
    fence = MagicMock()
    fence.id = uuid.uuid4()
    fence.name = "Block A"
    fence.project_id = project_id
    fence.created_at = None

    user = MagicMock()
    db = AsyncMock()

    fences_result = MagicMock()
    fences_result.scalars.return_value.all.return_value = [fence]
    project = MagicMock()
    project.id = project_id
    project.name = "Demo Project"
    projects_result = MagicMock()
    projects_result.scalars.return_value.all.return_value = [project]

    db.execute = AsyncMock(side_effect=[fences_result, projects_result])

    captured: dict[str, object] = {}

    async def fake_site(db, *, fence, project=None, weather_days=5):
        captured["project"] = project
        return {
            "work_area_id": str(fence.id),
            "work_area_name": fence.name,
            "project_id": str(project_id),
            "project_name": project.name if project else None,
            "latitude": 12.9,
            "longitude": 77.5,
            "composite_risk": "low",
            "pest_control_needed": False,
            "disease_control_needed": False,
            "rain_mm_next_48h": 0,
            "ndvi_trend": None,
            "healthy_pct": None,
            "tree_count": 0,
            "weather_alerts": [],
            "early_warnings": [],
            "fire_watch": {"risk_level": "none", "fire_count": 0, "nearest_km": None, "source": None},
            "flood_extent_watch": {
                "risk_level": "none",
                "water_extent_score": None,
                "delta_score": None,
                "rain_mm_48h": 0,
            },
            "forecast_summary": "Forecast unavailable.",
            "recommended_actions": [],
            "preparedness_brief": None,
        }

    with patch(
        "app.services.threats.watch.build_site_threat_watch",
        side_effect=fake_site,
    ):
        result = await build_portfolio_threat_watch(db, user=user, limit=12, use_cache=False)

    assert db.execute.await_count == 2
    assert captured["project"] is project
    assert result["summary"]["sites_failed"] == 0
