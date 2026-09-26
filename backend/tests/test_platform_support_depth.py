"""Tests for platform admin Phase G — support depth."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.platform import admin as admin_mod


@pytest.mark.asyncio
async def test_serialize_platform_user_includes_session_fields(monkeypatch):
    user = MagicMock(
        id=uuid.uuid4(),
        email="user@example.com",
        full_name="Test User",
        role="user",
        organization_id=uuid.uuid4(),
        org_role="manager",
        is_org_admin=False,
        is_active=True,
        is_verified=True,
        phone="+911234567890",
        email_verified_at=datetime(2026, 1, 1, tzinfo=UTC),
        sessions_invalidated_at=datetime(2026, 2, 1, tzinfo=UTC),
        created_at=datetime(2025, 12, 1, tzinfo=UTC),
        last_login_at=None,
    )
    db = AsyncMock()
    monkeypatch.setattr(admin_mod, "list_user_program_codes", AsyncMock(return_value=["gov-forest"]))

    row = await admin_mod._serialize_platform_user(db, user, "Test Org")

    assert row["phone"] == "+911234567890"
    assert row["sessions_invalidated_at"] == user.sessions_invalidated_at
    assert row["email_verified_at"] == user.email_verified_at
    assert row["organization_name"] == "Test Org"
    assert row["enrolled_program_codes"] == ["gov-forest"]
