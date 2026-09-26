"""Tests for satellite health LLM narrative with Gemini fallback."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.ai.satellite_health_llm import enrich_satellite_health_narrative
from app.services.ai.satellite_health_types import SatelliteHealthResult


@pytest.mark.asyncio
async def test_enrich_returns_none_without_keys():
    result = SatelliteHealthResult(
        risk_level="low",
        health_status="healthy",
        summary="Rule summary",
        ndvi_current=0.65,
        ndvi_trend="stable",
        trend_slope=0.0,
        pest_control_needed=False,
        disease_control_needed=False,
        findings=[],
        treatments=[],
        monitoring_plan=[],
        confidence=0.8,
        data_points=2,
        pipeline="byot-ndvi-health-1.0.0",
        raw_signals={},
    )
    with patch("app.services.ai.satellite_health_llm.settings") as mock_settings:
        mock_settings.openai_api_key = None
        mock_settings.gemini_api_key = None
        assert (
            await enrich_satellite_health_narrative(result, [], target_label="Block A")
        ) is None


@pytest.mark.asyncio
async def test_enrich_gemini_fallback_when_openai_missing():
    result = SatelliteHealthResult(
        risk_level="moderate",
        health_status="moderate",
        summary="Declining trend",
        ndvi_current=0.42,
        ndvi_trend="declining",
        trend_slope=-0.03,
        pest_control_needed=False,
        disease_control_needed=True,
        findings=[],
        treatments=[],
        monitoring_plan=[],
        confidence=0.75,
        data_points=3,
        pipeline="byot-ndvi-health-1.0.0",
        raw_signals={},
    )
    with patch("app.services.ai.satellite_health_llm.settings") as mock_settings:
        mock_settings.openai_api_key = None
        mock_settings.gemini_api_key = "test-key"
        with patch(
            "app.services.ai.satellite_health_llm._call_gemini",
            new=AsyncMock(return_value="Gemini narrative for farmers."),
        ):
            text = await enrich_satellite_health_narrative(result, [], target_label="Block A")
    assert text == "Gemini narrative for farmers."
