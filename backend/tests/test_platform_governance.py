"""Tests for platform admin Phase D — governance."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.services.platform.governance import (
    assert_registration_allowed,
    assert_writes_allowed,
    org_feature_flags,
    set_org_feature_flags,
)


@pytest.mark.asyncio
async def test_assert_writes_allowed_blocks_non_admin_in_maintenance():
    db = AsyncMock()
    user = MagicMock(role="user")
    row = MagicMock(maintenance_mode=True, maintenance_message="Planned downtime")
    db.get = AsyncMock(return_value=row)
    with pytest.raises(HTTPException) as exc:
        await assert_writes_allowed(db, user)
    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_assert_writes_allowed_allows_admin_in_maintenance():
    db = AsyncMock()
    user = MagicMock(role="admin")
    await assert_writes_allowed(db, user)


@pytest.mark.asyncio
async def test_assert_registration_allowed_when_disabled():
    db = AsyncMock()
    row = MagicMock(registration_enabled=False)
    db.get = AsyncMock(return_value=row)
    with pytest.raises(HTTPException) as exc:
        await assert_registration_allowed(db)
    assert exc.value.status_code == 403


def test_org_feature_flags_defaults():
    org = MagicMock(metadata_={})
    flags = org_feature_flags(org)
    assert flags["ai_scan"] is True
    assert flags["satellite"] is True


def test_set_org_feature_flags_persists():
    org = MagicMock(metadata_={}, id=uuid.uuid4())
    updated = set_org_feature_flags(org, {"satellite": False, "payments": False})
    assert updated["satellite"] is False
    assert updated["payments"] is False
    assert org.metadata_["feature_flags"]["satellite"] is False
