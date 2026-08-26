"""Tests for self-serve password reset."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.security import verify_password
from app.services.auth.password_reset import (
    PasswordResetError,
    confirm_password_reset,
    request_password_reset,
)


@pytest.mark.asyncio
async def test_request_password_reset_unknown_email_returns_none():
    db = MagicMock()
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
    with (
        patch("app.services.auth.password_reset.settings") as mock_settings,
        patch("app.services.auth.password_reset.ses_otp_configured", return_value=True),
        patch("app.services.auth.password_reset.issue_otp") as mock_issue,
        patch("app.services.auth.password_reset.send_password_reset_otp_email") as mock_send,
    ):
        mock_settings.allow_dev_otp = False
        hint = await request_password_reset(db, "missing@example.com")
        assert hint is None
        mock_issue.assert_not_called()
        mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_request_password_reset_sends_email_for_existing_user():
    user = MagicMock()
    db = MagicMock()
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=user)))
    with (
        patch("app.services.auth.password_reset.settings") as mock_settings,
        patch("app.services.auth.password_reset.ses_otp_configured", return_value=True),
        patch("app.services.auth.password_reset.issue_otp", AsyncMock(return_value="123456")),
        patch(
            "app.services.auth.password_reset.send_password_reset_otp_email",
            AsyncMock(),
        ) as mock_send,
    ):
        mock_settings.allow_dev_otp = False
        hint = await request_password_reset(db, "user@example.com")
        assert hint is None
        mock_send.assert_awaited_once_with(to="user@example.com", code="123456")


@pytest.mark.asyncio
async def test_confirm_password_reset_invalid_otp():
    db = MagicMock()
    with patch("app.services.auth.password_reset.check_otp", AsyncMock(return_value=False)):
        with pytest.raises(PasswordResetError) as exc:
            await confirm_password_reset(
                db,
                email="user@example.com",
                code="000000",
                password="SecurePassword12!",
            )
        assert exc.value.code == "invalid_otp"


@pytest.mark.asyncio
async def test_confirm_password_reset_updates_password():
    user = MagicMock()
    db = MagicMock()
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=user)))
    db.flush = AsyncMock()
    with patch("app.services.auth.password_reset.check_otp", AsyncMock(return_value=True)):
        updated = await confirm_password_reset(
            db,
            email="user@example.com",
            code="123456",
            password="SecurePassword12!",
        )
        assert updated is user
        assert verify_password("SecurePassword12!", user.hashed_password)
