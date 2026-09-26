"""Tests for platform admin Phase B — support actions."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.auth.sessions import (
    revoke_all_user_sessions,
    token_issued_before_invalidation,
)
from app.services.platform.impersonation import impersonation_token_for
from app.services.platform.support import (
    SupportActionError,
    admin_resend_verification,
    admin_revoke_sessions,
)


def test_token_issued_before_invalidation():
    user = MagicMock()
    user.sessions_invalidated_at = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)
    assert token_issued_before_invalidation(user, int(datetime(2026, 1, 1, 11, 0, 0, tzinfo=UTC).timestamp()))
    assert not token_issued_before_invalidation(user, int(datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC).timestamp()))
    assert not token_issued_before_invalidation(user, None)
    user.sessions_invalidated_at = None
    assert not token_issued_before_invalidation(user, 1000)


def test_revoke_all_user_sessions_sets_timestamp():
    user = MagicMock()
    user.sessions_invalidated_at = None
    ts = revoke_all_user_sessions(user)
    assert user.sessions_invalidated_at == ts
    assert ts.tzinfo is not None


def test_impersonation_read_only_claim():
    admin = MagicMock(id=uuid.uuid4(), email="admin@example.com", role="admin", organization_id=None)
    target = MagicMock(
        id=uuid.uuid4(),
        email="user@example.com",
        role="user",
        organization_id=None,
        is_active=True,
    )
    token_data = impersonation_token_for(admin=admin, target=target, read_only=True)
    assert token_data["read_only"] is True
    assert token_data["access_token"]


@pytest.mark.asyncio
async def test_admin_resend_verification_mark_verified():
    db = AsyncMock()
    user = MagicMock()
    user.is_verified = False
    user.email_verified_at = None
    result = await admin_resend_verification(db, user, mark_verified=True)
    assert result is None
    assert user.is_verified is True
    assert user.email_verified_at is not None


@pytest.mark.asyncio
async def test_admin_resend_verification_already_verified():
    db = AsyncMock()
    user = MagicMock()
    user.is_verified = True
    user.email_verified_at = datetime.now(UTC)
    with pytest.raises(SupportActionError, match="already_verified"):
        await admin_resend_verification(db, user, mark_verified=False)


def test_admin_revoke_sessions():
    user = MagicMock()
    user.sessions_invalidated_at = None
    ts = admin_revoke_sessions(user)
    assert user.sessions_invalidated_at == ts
