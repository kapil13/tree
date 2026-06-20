"""Tests for the stub AI service."""

from __future__ import annotations

import pytest

from app.services.ai import get_ai_service
from app.services.ai.types import GrowthContext


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
