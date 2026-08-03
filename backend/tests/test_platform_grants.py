"""Tests for per-user platform module grants."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.platform.grants import user_has_module_grant
from app.services.platform.modules import (
    USERS_ADMIN_MODULE,
    WEBSITE_CMS_MODULE,
    build_platform_access_map,
)
from app.services.platform.step_up import verify_admin_step_up


@pytest.mark.asyncio
async def test_user_has_module_grant(monkeypatch):
    db = AsyncMock()
    user_id = uuid.uuid4()

    async def fake_execute(stmt):
        result = MagicMock()
        result.scalar_one_or_none.return_value = uuid.uuid4()
        return result

    db.execute = fake_execute
    assert await user_has_module_grant(db, user_id, WEBSITE_CMS_MODULE)


def test_verify_admin_step_up_rejects_missing_password():
    actor = MagicMock()
    actor.hashed_password = "hash"
    with pytest.raises(Exception) as exc:
        verify_admin_step_up(actor, None)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_build_platform_access_map_includes_user_grants(monkeypatch):
    db = AsyncMock()

    async def fake_seed(db_):
        return None

    async def fake_can_access(db_, *, role, module_key, user_id=None):
        if user_id and module_key == WEBSITE_CMS_MODULE:
            return True
        return role == "admin"

    monkeypatch.setattr("app.services.platform.modules.ensure_platform_modules_seeded", fake_seed)
    monkeypatch.setattr("app.services.platform.modules.user_can_access_module", fake_can_access)

    access = await build_platform_access_map(db, role="ngo", user_id=uuid.uuid4())
    assert access[WEBSITE_CMS_MODULE] is True
    assert access[USERS_ADMIN_MODULE] is False
