"""Tests for Phase 4 intelligence hub."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.ai.assistant_service import PortfolioContext, detect_intent
from app.services.intelligence.integrations import build_integrations_health
from app.services.intelligence.summary import intelligence_context_for_assistant


def test_detect_intent_weather():
    assert detect_intent("Any rain forecast for my sites this week?") == "weather"


def test_detect_intent_threat():
    assert detect_intent("Show locust threat hotspots") == "threat"


def test_intelligence_context_for_assistant_truncates():
    summary = {
        "highest_risk": "high",
        "weather_alert_count": 3,
        "pest_high_count": 2,
        "pest_hotspots": [{"work_area_name": f"Site {i}"} for i in range(10)],
        "weather_alerts": [{"work_area_name": f"WA {i}"} for i in range(10)],
        "early_warnings": [{"title": f"W{i}"} for i in range(10)],
        "biodiversity": {"work_areas_with_snapshots": 4},
        "integrations": {"status": "ok"},
    }
    ctx = intelligence_context_for_assistant(summary)
    assert ctx["highest_risk"] == "high"
    assert len(ctx["pest_hotspots"]) <= 5
    assert len(ctx["weather_alerts"]) <= 5
    assert ctx["integrations_status"] == "ok"


@pytest.mark.asyncio
async def test_build_integrations_health_structure():
    with (
        patch(
            "app.services.intelligence.integrations._ping_open_meteo",
            new_callable=AsyncMock,
            return_value={"status": "ok", "reachable": True, "error": None},
        ),
        patch(
            "app.services.intelligence.integrations._ping_gbif",
            new_callable=AsyncMock,
            return_value={"status": "ok", "reachable": True, "error": None},
        ),
        patch("app.services.intelligence.integrations.has_sentinel_credentials", return_value=False),
        patch("app.services.intelligence.integrations.has_bhoonidhi_credentials", return_value=False),
    ):
        result = await build_integrations_health()

    assert result["status"] == "ok"
    assert "open_meteo" in result["integrations"]
    assert "gbif" in result["integrations"]
    assert result["integrations"]["sentinel_hub"]["status"] == "not_configured"


def test_portfolio_context_includes_intelligence_field():
    portfolio = PortfolioContext(intelligence={"highest_risk": "moderate"})
    data = portfolio.to_dict()
    assert data["intelligence"]["highest_risk"] == "moderate"
