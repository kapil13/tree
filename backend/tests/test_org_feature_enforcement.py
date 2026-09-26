"""Tests for org feature flag enforcement (Phase F)."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.services.platform.governance import (
    assert_org_feature_enabled,
    org_feature_flags_for_user,
)


@pytest.mark.asyncio
async def test_assert_org_feature_blocks_disabled_flag():
    org_id = uuid.uuid4()
    user = MagicMock(role="user", organization_id=org_id)
    org = MagicMock(metadata_={"feature_flags": {"satellite": False}})
    db = AsyncMock()
    db.get = AsyncMock(return_value=org)

    with pytest.raises(HTTPException) as exc:
        await assert_org_feature_enabled(db, user, "satellite")
    assert exc.value.status_code == 403
    assert exc.value.detail == "org_feature_disabled:satellite"


@pytest.mark.asyncio
async def test_assert_org_feature_allows_platform_admin():
    user = MagicMock(role="admin", organization_id=uuid.uuid4())
    db = AsyncMock()
    await assert_org_feature_enabled(db, user, "satellite")
    db.get.assert_not_called()


@pytest.mark.asyncio
async def test_assert_org_feature_allows_when_enabled():
    org_id = uuid.uuid4()
    user = MagicMock(role="user", organization_id=org_id)
    org = MagicMock(metadata_={"feature_flags": {"satellite": True}})
    db = AsyncMock()
    db.get = AsyncMock(return_value=org)
    await assert_org_feature_enabled(db, user, "satellite")


@pytest.mark.asyncio
async def test_org_feature_flags_for_user_returns_defaults_for_admin():
    user = MagicMock(role="admin", organization_id=None)
    db = AsyncMock()
    flags = await org_feature_flags_for_user(db, user)
    assert flags["ai_scan"] is True
    assert flags["payments"] is True
    db.get.assert_not_called()
