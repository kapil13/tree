"""Tests for optional LLM narrative enrichment."""

import asyncio
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

from app.services.ai.satellite_health import analyze_satellite_ndvi_health
from app.services.ai.satellite_health_llm import enrich_satellite_health_narrative
from app.services.ai.satellite_health_types import NdviObservation


def _obs(ndvi: float) -> NdviObservation:
    return NdviObservation(
        scene_acquired_at=datetime(2026, 6, 1, tzinfo=UTC),
        ndvi_mean=ndvi,
        ndvi_min=ndvi - 0.05,
        ndvi_max=ndvi + 0.05,
    )


def test_llm_returns_none_without_api_key():
    obs = [_obs(0.35), _obs(0.28)]
    result = analyze_satellite_ndvi_health(obs)
    with patch("app.services.ai.satellite_health_llm.settings") as mock_settings:
        mock_settings.openai_api_key = None
        out = asyncio.run(
            enrich_satellite_health_narrative(result, obs, target_label="Block A")
        )
    assert out is None


def test_llm_returns_narrative_when_api_responds():
    obs = [_obs(0.35), _obs(0.28)]
    result = analyze_satellite_ndvi_health(obs)

    mock_response = AsyncMock()
    mock_response.raise_for_status = lambda: None
    mock_response.json = lambda: {
        "choices": [{"message": {"content": "Your canopy shows stress. Scout for pests within 3 days."}}]
    }

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with (
        patch("app.services.ai.satellite_health_llm.settings") as mock_settings,
        patch("app.services.ai.satellite_health_llm.httpx.AsyncClient", return_value=mock_client),
    ):
        mock_settings.openai_api_key = "sk-test"
        out = asyncio.run(
            enrich_satellite_health_narrative(result, obs, target_label="Block A")
        )

    assert out is not None
    assert "Scout" in out
