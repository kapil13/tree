"""Tests for planting audience onboarding gating and legacy org backfill."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.onboarding.audience_storage import (
    backfill_org_audience_from_type,
    get_user_planting_audience,
    infer_audience_from_org_type,
    user_needs_audience_onboarding,
)


def test_infer_audience_from_org_type_maps_known_types():
    assert infer_audience_from_org_type("government") == "government"
    assert infer_audience_from_org_type("corporate") == "corporate_esg"
    assert infer_audience_from_org_type("ngo") == "general"
    assert infer_audience_from_org_type("individual") is None


@pytest.mark.asyncio
async def test_user_needs_audience_only_during_signup(monkeypatch):
    user = MagicMock(id=uuid.uuid4(), organization_id=uuid.uuid4())
    request = MagicMock(status="draft", program=MagicMock(code="government_nhai"))
    db = MagicMock()

    monkeypatch.setattr(
        "app.services.onboarding.audience_storage.get_user_planting_audience",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.services.onboarding.audience_storage._latest_professional_request",
        AsyncMock(return_value=request),
    )

    assert await user_needs_audience_onboarding(db, user, ["government_nhai"]) is True


@pytest.mark.asyncio
async def test_user_needs_audience_false_for_established_org(monkeypatch):
    user = MagicMock(id=uuid.uuid4(), organization_id=uuid.uuid4())
    db = MagicMock()

    monkeypatch.setattr(
        "app.services.onboarding.audience_storage.get_user_planting_audience",
        AsyncMock(return_value=None),
    )
    monkeypatch.setattr(
        "app.services.onboarding.audience_storage._latest_professional_request",
        AsyncMock(return_value=None),
    )

    assert await user_needs_audience_onboarding(db, user, ["government_nhai"]) is False


@pytest.mark.asyncio
async def test_get_user_planting_audience_infers_from_org_type(monkeypatch):
    org_id = uuid.uuid4()
    user = MagicMock(id=uuid.uuid4(), organization_id=org_id)
    org = MagicMock(type="government", metadata_={})
    db = MagicMock()
    db.get = AsyncMock(return_value=org)

    monkeypatch.setattr(
        "app.services.onboarding.audience_storage._latest_professional_request",
        AsyncMock(return_value=None),
    )

    assert await get_user_planting_audience(db, user) == "government"


@pytest.mark.asyncio
async def test_backfill_org_audience_persists_inferred_value():
    org = MagicMock(type="corporate", metadata_={})
    db = MagicMock()
    db.flush = AsyncMock()

    audience = await backfill_org_audience_from_type(db, org)

    assert audience == "corporate_esg"
    assert org.metadata_["audience"] == "corporate_esg"
    db.flush.assert_awaited_once()
