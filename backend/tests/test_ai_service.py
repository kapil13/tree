"""Tests for AI service factory and status."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.ai.service import (
    StubAIService,
    ai_service_status,
    get_ai_service,
    reset_ai_service,
)
from app.services.ai.types import GrowthContext


@pytest.fixture(autouse=True)
def _reset_service():
    reset_ai_service()
    yield
    reset_ai_service()


def test_ai_service_status_stub_without_keys(monkeypatch):
    monkeypatch.setattr("app.services.ai.service.settings.openai_api_key", None)
    monkeypatch.setattr("app.services.ai.service.settings.gemini_api_key", None)
    status = ai_service_status()
    assert status["mode"] == "estimate"
    assert status["provider"] == "stub"


def test_ai_service_status_openai_when_key_set(monkeypatch):
    monkeypatch.setattr("app.services.ai.service.settings.openai_api_key", "sk-test")
    monkeypatch.setattr("app.services.ai.service.settings.gemini_api_key", None)
    status = ai_service_status()
    assert status["mode"] == "live"
    assert status["provider"] == "openai"


def test_get_ai_service_returns_stub_without_keys(monkeypatch):
    monkeypatch.setattr("app.services.ai.service.settings.openai_api_key", None)
    monkeypatch.setattr("app.services.ai.service.settings.gemini_api_key", None)
    ai = get_ai_service()
    assert isinstance(ai, StubAIService)


@pytest.mark.asyncio
async def test_full_analysis_falls_back_to_stub_when_llm_unavailable(monkeypatch):
    monkeypatch.setattr("app.services.ai.service.settings.openai_api_key", "sk-test")
    monkeypatch.setattr("app.services.ai.service.settings.gemini_api_key", None)
    with patch(
        "app.services.ai.service.analyze_tree_vision",
        new_callable=AsyncMock,
        return_value=None,
    ):
        ai = get_ai_service()
        res = await ai.full_analysis(
            images=[b"sample-image-bytes"],
            species_hint="Mango",
            ctx=GrowthContext(species_scientific="Mangifera indica", age_years=6),
        )
    assert res.species.top.confidence > 0
    assert res.pipeline == StubAIService.name


@pytest.mark.asyncio
async def test_species_with_hint_returns_hinted_species():
    ai = get_ai_service()
    res = await ai.detect_species([b"dummy"], hint="Neem")
    assert "Neem" in res.top.common_name or "Azadirachta" in res.top.scientific_name
    assert 0 < res.top.confidence <= 1
    assert len(res.topk) >= 1


@pytest.mark.asyncio
async def test_full_analysis_consistent():
    ai = get_ai_service()
    res = await ai.full_analysis(
        images=[b"sample-image-bytes"],
        species_hint="Mango",
        ctx=GrowthContext(species_scientific="Mangifera indica", age_years=6),
    )
    assert res.species.top.confidence > 0
    assert res.health.health_class in {
        "healthy",
        "moderate",
        "unhealthy",
        "disease_risk",
    }
    assert res.growth.dbh_cm > 0
    assert res.growth.height_m > 0
    assert res.overall_confidence > 0
    assert res.recommendations


@pytest.mark.asyncio
async def test_assistant_returns_numeric_answer():
    ai = get_ai_service()
    out = await ai.assistant(
        "How much CO2 will my 50 Neem trees sequester in 10 years?",
        {"species": "Neem", "tree_count": 50, "years": 10},
    )
    assert "answer" in out
    assert out["calculations"]["tree_count"] == 50
    assert out["calculations"]["years"] == 10
    assert out["calculations"]["total_tco2e"] > 0
