"""Tests for Wave 2 RBAC — viewer read-only and invite preview."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.security import user_can_write, user_is_org_viewer
from app.services.organizations.members import OrgMemberError, get_invite_preview


def test_user_is_org_viewer():
    viewer = MagicMock(org_role="viewer", role="government")
    worker = MagicMock(org_role="worker", role="field_worker")
    assert user_is_org_viewer(viewer) is True
    assert user_is_org_viewer(worker) is False


def test_user_can_write_blocks_viewer():
    viewer = MagicMock(org_role="viewer", role="government")
    admin = MagicMock(org_role="manager", role="government")
    platform_admin = MagicMock(org_role=None, role="admin")
    assert user_can_write(viewer) is False
    assert user_can_write(admin) is True
    assert user_can_write(platform_admin) is True


@pytest.mark.asyncio
async def test_get_invite_preview_not_found():
    db = MagicMock()
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=lambda: None))
    with pytest.raises(OrgMemberError) as exc:
        await get_invite_preview(db, invite_token="missing")
    assert exc.value.code == "invite_not_found"


@pytest.mark.asyncio
async def test_get_invite_preview_expired():
    org = MagicMock(name="NHAI Package A")
    invite = MagicMock(
        status="pending",
        expires_at=datetime.now(UTC) - timedelta(days=1),
        organization=org,
    )
    db = MagicMock()
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=lambda: invite))
    db.flush = AsyncMock()
    with pytest.raises(OrgMemberError) as exc:
        await get_invite_preview(db, invite_token=str(uuid.uuid4()))
    assert exc.value.code == "invite_expired"
