"""Tests for DPDP privacy endpoints."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services.privacy.consent import grant_consent, withdraw_consent
from app.services.privacy.constants import PRIVACY_POLICY_VERSION
from app.services.privacy.erasure import queue_account_erasure
from app.services.privacy.export import build_user_data_export


@pytest.mark.asyncio
async def test_grant_consent_validates_purpose():
    user = SimpleNamespace(id=uuid.uuid4())
    db = AsyncMock()
    with pytest.raises(ValueError, match="invalid_consent_purpose"):
        await grant_consent(db, user=user, purpose="invalid")


@pytest.mark.asyncio
async def test_cannot_withdraw_essential_consent():
    user = SimpleNamespace(id=uuid.uuid4())
    db = AsyncMock()
    with pytest.raises(ValueError, match="essential_consent_required"):
        await withdraw_consent(db, user=user, purpose="essential")


@pytest.mark.asyncio
async def test_account_erasure_redacts_email():
    user = SimpleNamespace(
        id=uuid.uuid4(),
        email="user@example.com",
        phone="+919999999999",
        full_name="Test User",
        hashed_password="hash",
        google_sub="sub",
        is_active=True,
        sessions_invalidated_at=None,
        notification_preferences={},
    )
    db = AsyncMock()
    db.flush = AsyncMock()
    result = await queue_account_erasure(db, user=user, reason="testing")
    assert result["status"] == "erased"
    assert user.is_active is False
    assert "redacted.byot.local" in user.email
    assert user.full_name == "Deleted User"


@pytest.mark.asyncio
async def test_data_export_includes_profile():
    user = SimpleNamespace(
        id=uuid.uuid4(),
        email="demo@byot.earth",
        phone=None,
        full_name="Demo",
        role="user",
        org_role=None,
        organization_id=None,
        date_of_birth=None,
        date_of_marriage=None,
        city=None,
        state=None,
        locale="en",
        created_at=None,
        notification_preferences={},
    )
    db = AsyncMock()

    async def fake_execute(stmt):
        return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: []))

    db.execute = fake_execute
    payload = await build_user_data_export(db, user)
    assert payload["profile"]["email"] == "demo@byot.earth"
    assert payload["export_version"] == "1.0"


def test_privacy_policy_version_set():
    assert PRIVACY_POLICY_VERSION
