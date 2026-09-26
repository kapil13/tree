"""Phase C — audience journey routing and NGO parity."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.onboarding.audience import normalize_audience
from app.services.onboarding.audience_journey import (
    default_project_selection,
    resolve_audience_context,
)
from app.services.onboarding.audience_presets import get_audience_preset, list_audience_presets


def test_ngo_community_preset_exists():
    preset = get_audience_preset("ngo_community")
    assert preset is not None
    assert preset["recommended_program_code"] == "ngo_community"
    assert "mgnrega_convergence" in preset["recommended_scheme_codes"]


def test_normalize_audience_accepts_ngo_community():
    assert normalize_audience("ngo_community") == "ngo_community"


def test_list_presets_includes_ngo_community():
    codes = {preset["code"] for preset in list_audience_presets()}
    assert "ngo_community" in codes


def test_default_project_selection_uses_first_recommended_scheme():
    preset = get_audience_preset("government")
    assert preset is not None
    selection = default_project_selection(preset, ["government_nhai"])
    assert selection["program_code"] == "government_nhai"
    assert selection["scheme_code"] == preset["recommended_scheme_codes"][0]
    assert selection["template_code"] == preset["recommended_template_code"]


def test_default_project_selection_falls_back_to_enrolled_program():
    preset = get_audience_preset("corporate_esg")
    assert preset is not None
    selection = default_project_selection(preset, ["government_nhai"])
    assert selection["program_code"] == "government_nhai"


@pytest.mark.asyncio
async def test_resolve_audience_context_returns_highlights(monkeypatch):
    user = MagicMock(id=uuid.uuid4(), organization_id=uuid.uuid4())
    db = MagicMock()

    monkeypatch.setattr(
        "app.services.onboarding.audience_journey.get_user_planting_audience",
        AsyncMock(return_value="mining"),
    )
    monkeypatch.setattr(
        "app.services.onboarding.audience_journey.list_user_program_codes",
        AsyncMock(return_value=["corporate_esg"]),
    )

    context = await resolve_audience_context(db, user)

    assert context["audience"] == "mining"
    assert context["preset"]["code"] == "mining"
    assert "greenbelt" in context["dashboard_highlights"]
    assert context["default_project"]["scheme_code"] == "mining_reclamation"
