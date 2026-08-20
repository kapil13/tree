"""Tests for platform admin Phase C — bulk ops and exports."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.platform.bulk_ops import bulk_update_organizations, bulk_update_users
from app.services.platform.exports import export_platform_users_csv


@pytest.mark.asyncio
async def test_bulk_update_users_activate():
    db = AsyncMock()
    actor = MagicMock(id=uuid.uuid4(), role="admin")
    user_id = uuid.uuid4()
    user = MagicMock(id=user_id, role="user", is_active=False)
    db.get = AsyncMock(return_value=user)

    result = await bulk_update_users(
        db, actor=actor, user_ids=[user_id], action="activate"
    )
    assert result["processed"] == 1
    assert user.is_active is True


@pytest.mark.asyncio
async def test_bulk_update_users_skips_self_deactivate():
    db = AsyncMock()
    actor_id = uuid.uuid4()
    actor = MagicMock(id=actor_id, role="admin")
    user = MagicMock(id=actor_id, role="admin", is_active=True)
    db.get = AsyncMock(return_value=user)

    result = await bulk_update_users(
        db, actor=actor, user_ids=[actor_id], action="deactivate"
    )
    assert result["processed"] == 0
    assert result["skipped"] == 1


@pytest.mark.asyncio
async def test_bulk_suspend_org_revokes_sessions():
    db = AsyncMock()
    org_id = uuid.uuid4()
    org = MagicMock(id=org_id, is_active=True)
    member = MagicMock(sessions_invalidated_at=None)
    db.get = AsyncMock(return_value=org)

    execute_result = MagicMock()
    execute_result.scalars.return_value.all.return_value = [member]
    db.execute = AsyncMock(return_value=execute_result)

    result = await bulk_update_organizations(
        db,
        org_ids=[org_id],
        is_active=False,
        revoke_member_sessions=True,
    )
    assert result["processed"] == 1
    assert org.is_active is False
    assert result["sessions_revoked"] == 1
    assert member.sessions_invalidated_at is not None


@pytest.mark.asyncio
async def test_export_platform_users_csv_header():
    db = AsyncMock()
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(
            "app.services.platform.exports.query_platform_users",
            AsyncMock(return_value=([], 0)),
        )
        csv_text = await export_platform_users_csv(db)
    assert "id,email,full_name" in csv_text.splitlines()[0]
