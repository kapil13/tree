"""Tests for Resend-backed auth email OTP sender."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.services.auth.ses_email_sender import (
    EmailSendError,
    send_auth_otp_email,
    send_signup_otp_email,
    ses_otp_configured,
)
from app.services.email.config import email_otp_configured, resend_configured


def test_resend_configured_requires_api_key_and_sender():
    with patch("app.services.email.config.settings") as mock_settings:
        mock_settings.resend_api_key = "re_test_key"
        mock_settings.resend_from_email = "no-reply@aranyix.tech"
        assert resend_configured() is True

    with patch("app.services.email.config.settings") as mock_settings:
        mock_settings.resend_api_key = None
        mock_settings.resend_from_email = "no-reply@aranyix.tech"
        assert resend_configured() is False


def test_email_otp_configured_requires_toggle_and_resend():
    with patch("app.services.email.config.settings") as mock_settings:
        mock_settings.auth_otp_email_enabled = True
        mock_settings.resend_api_key = "re_test_key"
        mock_settings.resend_from_email = "no-reply@aranyix.tech"
        assert email_otp_configured() is True

    with patch("app.services.email.config.settings") as mock_settings:
        mock_settings.auth_otp_email_enabled = False
        mock_settings.resend_api_key = "re_test_key"
        mock_settings.resend_from_email = "no-reply@aranyix.tech"
        assert email_otp_configured() is False


def test_ses_otp_configured_alias_matches_email_otp_configured():
    with patch("app.services.email.config.settings") as mock_settings:
        mock_settings.auth_otp_email_enabled = True
        mock_settings.resend_api_key = "re_test_key"
        mock_settings.resend_from_email = "no-reply@aranyix.tech"
        assert ses_otp_configured() is True


@pytest.mark.asyncio
async def test_send_auth_otp_email_delegates_to_resend_service():
    with patch("app.services.auth.ses_email_sender.send_login_otp") as mock_send:
        await send_auth_otp_email(to="user@example.com", code="999888")
        mock_send.assert_awaited_once_with(to="user@example.com", code="999888")


@pytest.mark.asyncio
async def test_send_signup_otp_email_delegates_to_resend_service():
    with patch("app.services.auth.ses_email_sender.send_verification_otp") as mock_send:
        await send_signup_otp_email(to="user@example.com", code="123456")
        mock_send.assert_awaited_once_with(to="user@example.com", code="123456")


@pytest.mark.asyncio
async def test_send_login_otp_raises_when_not_configured():
    from app.services.email.service import send_login_otp

    with patch("app.services.email.service.email_otp_configured", return_value=False):
        with pytest.raises(EmailSendError) as exc:
            await send_login_otp(to="user@example.com", code="111111")
        assert exc.value.code == "email_otp_not_configured"


@pytest.mark.asyncio
async def test_send_login_otp_uses_resend_provider():
    from app.services.email.service import send_login_otp

    with (
        patch("app.services.email.service.email_otp_configured", return_value=True),
        patch("app.services.email.service.resend_configured", return_value=True),
        patch("app.services.email.service.send_email") as mock_send,
    ):
        await send_login_otp(to="user@example.com", code="654321")
        mock_send.assert_awaited_once()
        assert mock_send.call_args.kwargs["to"] == "user@example.com"
        assert "654321" in mock_send.call_args.kwargs["html"]
        assert "sign-in" in mock_send.call_args.kwargs["subject"].lower()


@pytest.mark.asyncio
async def test_send_signup_email_otp_uses_resend_when_configured():
    from app.services.auth.signup import send_signup_email_otp

    token = "email-otp-token"
    with (
        patch("app.services.auth.signup.load_signup_session") as mock_session,
        patch("app.services.auth.signup.issue_otp", return_value="654321") as mock_issue,
        patch("app.services.auth.signup.ses_otp_configured", return_value=True),
        patch("app.services.auth.signup.send_signup_otp_email") as mock_send,
    ):
        mock_session.return_value = {
            "email": "citizen@example.com",
            "phone_verified": True,
        }
        hint = await send_signup_email_otp(token)
        mock_issue.assert_awaited_once_with("signup_email", token)
        mock_send.assert_awaited_once_with(to="citizen@example.com", code="654321")
        assert hint is None


@pytest.mark.asyncio
async def test_send_signup_email_otp_returns_dev_code_when_resend_disabled():
    from app.services.auth.signup import send_signup_email_otp

    token = "dev-email-token"
    with (
        patch("app.services.auth.signup.load_signup_session") as mock_session,
        patch("app.services.auth.signup.issue_otp", return_value="000000"),
        patch("app.services.auth.signup.ses_otp_configured", return_value=False),
        patch("app.services.auth.signup.settings") as mock_settings,
        patch("app.services.auth.signup.send_signup_otp_email") as mock_send,
    ):
        mock_settings.allow_dev_otp = True
        mock_session.return_value = {
            "email": "citizen@example.com",
            "phone_verified": True,
        }
        hint = await send_signup_email_otp(token)
        mock_send.assert_not_called()
        assert hint == "000000"
