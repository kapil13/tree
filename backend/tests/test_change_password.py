"""Tests for authenticated password change."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.security import hash_password, verify_password
from app.services.auth.change_password import ChangePasswordError, change_password


@pytest.mark.asyncio
async def test_change_password_rejects_when_no_password_set():
    user = MagicMock(hashed_password=None)
    db = MagicMock()
    db.flush = AsyncMock()
    with pytest.raises(ChangePasswordError) as exc:
        await change_password(
            db,
            user=user,
            current_password="OldPassword12!",
            new_password="NewPassword12!",
        )
    assert exc.value.code == "password_not_set"


@pytest.mark.asyncio
async def test_change_password_rejects_wrong_current():
    user = MagicMock(hashed_password=hash_password("CorrectPassword12!"))
    db = MagicMock()
    db.flush = AsyncMock()
    with pytest.raises(ChangePasswordError) as exc:
        await change_password(
            db,
            user=user,
            current_password="WrongPassword12!",
            new_password="NewPassword12!",
        )
    assert exc.value.code == "invalid_current_password"


@pytest.mark.asyncio
async def test_change_password_rejects_same_password():
    user = MagicMock(hashed_password=hash_password("SamePassword12!"))
    db = MagicMock()
    db.flush = AsyncMock()
    with pytest.raises(ChangePasswordError) as exc:
        await change_password(
            db,
            user=user,
            current_password="SamePassword12!",
            new_password="SamePassword12!",
        )
    assert exc.value.code == "password_unchanged"


@pytest.mark.asyncio
async def test_change_password_updates_hash_and_revokes_sessions():
    user = MagicMock(hashed_password=hash_password("OldPassword12!"))
    user.sessions_invalidated_at = None
    db = MagicMock()
    db.flush = AsyncMock()
    with patch("app.services.auth.change_password.revoke_all_user_sessions") as mock_revoke:
        await change_password(
            db,
            user=user,
            current_password="OldPassword12!",
            new_password="NewPassword12!",
        )
        mock_revoke.assert_called_once_with(user)
    assert verify_password("NewPassword12!", user.hashed_password)
    assert not verify_password("OldPassword12!", user.hashed_password)
    db.flush.assert_awaited_once()
