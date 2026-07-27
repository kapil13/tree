"""Program enrollment sync from platform role and org metadata."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.services.planting_programs.enrollment import sync_user_program_enrollment


@pytest.mark.asyncio
async def test_sync_enrolls_government_role_user(monkeypatch):
    user_id = uuid4()
    user = MagicMock(
        id=user_id,
        role="government",
        organization_id=uuid4(),
    )
    org = MagicMock(type="farm", metadata_={})

    db = AsyncMock()
    db.get = AsyncMock(return_value=org)

    list_codes = AsyncMock(return_value=["byot"])
    set_programs = AsyncMock()

    async def fake_org_program_codes(_org):
        return []

    monkeypatch.setattr(
        "app.services.planting_programs.enrollment.list_user_program_codes",
        list_codes,
    )
    monkeypatch.setattr(
        "app.services.planting_programs.enrollment.set_user_programs",
        set_programs,
    )
    monkeypatch.setattr(
        "app.services.organizations.onboarding.org_program_codes",
        fake_org_program_codes,
    )

    changed = await sync_user_program_enrollment(db, user)

    assert changed is True
    set_programs.assert_awaited_once_with(db, user_id, ["byot", "government_nhai"])


@pytest.mark.asyncio
async def test_sync_noop_when_already_enrolled(monkeypatch):
    user = MagicMock(id=uuid4(), role="government", organization_id=None)

    db = AsyncMock()
    list_codes = AsyncMock(return_value=["byot", "government_nhai"])
    set_programs = AsyncMock()

    monkeypatch.setattr(
        "app.services.planting_programs.enrollment.list_user_program_codes",
        list_codes,
    )
    monkeypatch.setattr(
        "app.services.planting_programs.enrollment.set_user_programs",
        set_programs,
    )

    changed = await sync_user_program_enrollment(db, user)

    assert changed is False
    set_programs.assert_not_awaited()
