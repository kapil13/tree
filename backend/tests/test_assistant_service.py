"""Tests for portfolio-aware assistant."""

from __future__ import annotations

import pytest

from app.services.ai.assistant_service import (
    PortfolioContext,
    answer_with_rules,
    detect_intent,
    parse_carbon_params,
)


def test_detect_intent_carbon():
    assert detect_intent("How much CO2 will 50 Neem trees sequester?") == "carbon"


def test_detect_intent_health():
    assert detect_intent("What is the health of my trees?") == "health"


def test_detect_intent_portfolio():
    assert detect_intent("Give me a portfolio summary") == "portfolio"


def test_detect_intent_biodiversity():
    assert detect_intent("How many bird species were detected in bioacoustic recordings?") == "biodiversity"


def test_parse_carbon_params_extracts_numbers():
    portfolio = PortfolioContext(total_trees=100, top_species=[("Mango", 40)])
    params = parse_carbon_params("How much CO2 will 50 Neem trees sequester in 10 years?", portfolio)
    assert params["tree_count"] == 50
    assert params["years"] == 10
    assert params["species"] == "Neem"


def test_answer_portfolio_uses_live_counts():
    portfolio = PortfolioContext(
        total_trees=12,
        total_co2e_kg=480.0,
        annual_sequestration_kg=33.6,
        pct_healthy=75.0,
        pct_satellite_verified=50.0,
        health_breakdown={"healthy": 9, "moderate": 3},
        top_species=[("Neem", 8), ("Mango", 4)],
    )
    out = answer_with_rules("portfolio summary", portfolio)
    assert "12 trees" in out["answer"]
    assert out["calculations"]["intent"] == "portfolio"


def test_answer_health_differs_from_carbon():
    portfolio = PortfolioContext(
        total_trees=5,
        health_breakdown={"healthy": 3, "unhealthy": 2},
        pct_healthy=60.0,
    )
    health = answer_with_rules("tree health status", portfolio)
    carbon = answer_with_rules("carbon sequestration estimate", portfolio)
    assert health["answer"] != carbon["answer"]
    assert "healthy" in health["answer"].lower()
    assert health["calculations"]["intent"] == "health"
    assert carbon["calculations"]["intent"] == "carbon"


@pytest.mark.asyncio
async def test_stub_assistant_still_works_for_carbon():
    """Legacy stub path remains available on AIService for direct calls."""
    from app.services.ai import get_ai_service

    ai = get_ai_service()
    out = await ai.assistant(
        "How much CO2 will my 50 Neem trees sequester in 10 years?",
        {"species": "Neem", "tree_count": 50, "years": 10},
    )
    assert out["calculations"]["tree_count"] == 50
    assert out["calculations"]["years"] == 10
