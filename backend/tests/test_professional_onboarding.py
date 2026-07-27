"""Tests for professional signup onboarding."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.planting_programs.onboarding import (
    OrgProfileIn,
    get_user_onboarding_state,
    resolve_signup_program_code,
    submit_org_profile,
)
from app.services.planting_programs.signup_categories import (
    normalize_signup_category,
    program_code_for_signup_category,
)


def test_normalize_signup_category_aliases():
    assert normalize_signup_category("government") == "government_nhai"
    assert normalize_signup_category("ngo") == "ngo_community"
    assert program_code_for_signup_category("corporate_esg") == "corporate_esg"
    assert program_code_for_signup_category("byot") is None


def test_resolve_signup_program_code_invalid():
    from app.services.planting_programs.access_requests import AccessRequestError

    with pytest.raises(AccessRequestError):
        resolve_signup_program_code("invalid_category")


@pytest.mark.asyncio
async def test_get_user_onboarding_state_profile_required(monkeypatch):
    program = MagicMock(code="government_nhai", name="Government")
    request = MagicMock(
        status="draft",
        org_profile=None,
        program=program,
        id=uuid.uuid4(),
        admin_note=None,
    )
    monkeypatch.setattr(
        "app.services.planting_programs.onboarding.list_user_program_codes",
        AsyncMock(return_value=["byot"]),
    )
    monkeypatch.setattr(
        "app.services.planting_programs.onboarding._latest_professional_request",
        AsyncMock(return_value=request),
    )
    state = await get_user_onboarding_state(MagicMock(), uuid.uuid4())
    assert state.status == "profile_required"
    assert state.program_code == "government_nhai"


@pytest.mark.asyncio
async def test_submit_org_profile_moves_to_pending(monkeypatch):
    program = MagicMock(code="corporate_esg", name="ESG")
    request = MagicMock(
        status="draft",
        org_profile=None,
        program=program,
        id=uuid.uuid4(),
        message=None,
        admin_note=None,
        reviewed_by=None,
        reviewed_at=None,
    )
    monkeypatch.setattr(
        "app.services.planting_programs.onboarding._latest_professional_request",
        AsyncMock(return_value=request),
    )
    monkeypatch.setattr(
        "app.services.planting_programs.onboarding.get_access_request",
        AsyncMock(return_value=request),
    )
    db = MagicMock()
    db.flush = AsyncMock()
    profile = OrgProfileIn(
        organization_name="Acme Corp",
        organization_type="corporate",
        designation="CSR Lead",
        city="Mumbai",
        state="Maharashtra",
        use_case_summary="Corporate plantation for ESG reporting.",
    )
    result = await submit_org_profile(db, user_id=uuid.uuid4(), profile=profile)
    assert result.status == "pending"
    assert request.org_profile["organization_name"] == "Acme Corp"
