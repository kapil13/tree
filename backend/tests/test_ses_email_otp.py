"""Tests for Amazon SES auth email OTP sender."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from app.services.auth.ses_email_sender import (
    EmailSendError,
    send_auth_otp_email,
    send_signup_otp_email,
    ses_otp_configured,
)


def test_ses_otp_configured_requires_all_settings():
    with patch("app.services.auth.ses_email_sender.settings") as mock_settings, patch(
        "app.services.auth.ses_email_sender.boto3", object()
    ):
        mock_settings.auth_otp_email_enabled = True
        mock_settings.ses_sender = "no-reply@aranyix.tech"
        mock_settings.aws_access_key_id = "AKIA"
        mock_settings.aws_secret_access_key = "secret"
        assert ses_otp_configured() is True

    with patch("app.services.auth.ses_email_sender.settings") as mock_settings, patch(
        "app.services.auth.ses_email_sender.boto3", object()
    ):
        mock_settings.auth_otp_email_enabled = False
        mock_settings.ses_sender = "no-reply@aranyix.tech"
        mock_settings.aws_access_key_id = "AKIA"
        mock_settings.aws_secret_access_key = "secret"
        assert ses_otp_configured() is False


def test_send_email_sync_rejects_missing_sender():
    with patch("app.services.auth.ses_email_sender.settings") as mock_settings:
        mock_settings.ses_sender = ""
        from app.services.auth.ses_email_sender import _send_email_sync

        with pytest.raises(EmailSendError) as exc:
            _send_email_sync(to="user@example.com", subject="Test", body="Hi")
        assert exc.value.code == "email_otp_not_configured"


@pytest.mark.asyncio
async def test_send_auth_otp_email_delegates_to_sync_sender():
    with (
        patch("app.services.auth.ses_email_sender.ses_otp_configured", return_value=True),
        patch("app.services.auth.ses_email_sender._send_email_sync") as mock_send,
    ):
        await send_auth_otp_email(to="user@example.com", code="999888")
        mock_send.assert_called_once()
        assert mock_send.call_args.kwargs["to"] == "user@example.com"
        assert "999888" in mock_send.call_args.kwargs["body"]
        assert "sign-in" in mock_send.call_args.kwargs["subject"].lower()


@pytest.mark.asyncio
async def test_send_signup_otp_email_delegates_to_sync_sender():
    with (
        patch("app.services.auth.ses_email_sender.ses_otp_configured", return_value=True),
        patch("app.services.auth.ses_email_sender._send_email_sync") as mock_send,
    ):
        await send_signup_otp_email(to="user@example.com", code="123456")
        mock_send.assert_called_once()
        assert mock_send.call_args.kwargs["to"] == "user@example.com"
        assert "123456" in mock_send.call_args.kwargs["body"]


@pytest.mark.asyncio
async def test_send_signup_email_otp_uses_ses_when_configured():
    from app.services.auth.signup import send_signup_email_otp

    token = "email-otp-token"
    with (
        patch("app.services.auth.signup.load_signup_session") as mock_session,
        patch("app.services.auth.signup.issue_otp", return_value="654321") as mock_issue,
        patch("app.services.auth.signup.ses_otp_configured", return_value=True),
        patch("app.services.auth.signup.send_signup_otp_email") as mock_ses,
    ):
        mock_session.return_value = {
            "email": "citizen@example.com",
            "phone_verified": True,
        }
        hint = await send_signup_email_otp(token)
        mock_issue.assert_awaited_once_with("signup_email", token)
        mock_ses.assert_awaited_once_with(to="citizen@example.com", code="654321")
        assert hint is None


@pytest.mark.asyncio
async def test_send_signup_email_otp_returns_dev_code_when_ses_disabled():
    from app.services.auth.signup import send_signup_email_otp

    token = "dev-email-token"
    with (
        patch("app.services.auth.signup.load_signup_session") as mock_session,
        patch("app.services.auth.signup.issue_otp", return_value="000000"),
        patch("app.services.auth.signup.ses_otp_configured", return_value=False),
        patch("app.services.auth.signup.settings") as mock_settings,
        patch("app.services.auth.signup.send_signup_otp_email") as mock_ses,
    ):
        mock_settings.allow_dev_otp = True
        mock_session.return_value = {
            "email": "citizen@example.com",
            "phone_verified": True,
        }
        hint = await send_signup_email_otp(token)
        mock_ses.assert_not_called()
        assert hint == "000000"
