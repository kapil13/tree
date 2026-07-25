"""Tests for Gmail API email OTP sender."""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest

from app.services.auth.gmail_sender import (
    GmailSendError,
    _load_service_account_info,
    gmail_otp_configured,
    send_signup_otp_email,
)


def test_gmail_otp_configured_requires_all_settings():
    with patch("app.services.auth.gmail_sender.settings") as mock_settings:
        mock_settings.auth_otp_email_enabled = True
        mock_settings.gmail_sender = "no-reply@aranyix.tech"
        mock_settings.google_service_account_json = '{"type":"service_account"}'
        assert gmail_otp_configured() is True

    with patch("app.services.auth.gmail_sender.settings") as mock_settings:
        mock_settings.auth_otp_email_enabled = False
        mock_settings.gmail_sender = "no-reply@aranyix.tech"
        mock_settings.google_service_account_json = "{}"
        assert gmail_otp_configured() is False


def test_load_service_account_info_from_inline_json():
    payload = {"type": "service_account", "client_email": "svc@test.iam.gserviceaccount.com"}
    with patch("app.services.auth.gmail_sender.settings") as mock_settings:
        mock_settings.google_service_account_json = json.dumps(payload)
        assert _load_service_account_info() == payload


def test_load_service_account_info_rejects_missing_config():
    with patch("app.services.auth.gmail_sender.settings") as mock_settings:
        mock_settings.google_service_account_json = None
        with pytest.raises(GmailSendError) as exc:
            _load_service_account_info()
        assert exc.value.code == "gmail_not_configured"


@pytest.mark.asyncio
async def test_send_signup_otp_email_delegates_to_sync_sender():
    with (
        patch("app.services.auth.gmail_sender.gmail_otp_configured", return_value=True),
        patch("app.services.auth.gmail_sender._send_email_sync") as mock_send,
    ):
        await send_signup_otp_email(to="user@example.com", code="123456")
        mock_send.assert_called_once()
        assert mock_send.call_args.kwargs["to"] == "user@example.com"
        assert "123456" in mock_send.call_args.kwargs["body"]


@pytest.mark.asyncio
async def test_send_signup_email_otp_uses_gmail_when_configured():
    from app.services.auth.signup import send_signup_email_otp

    token = "email-otp-token"
    with (
        patch("app.services.auth.signup.load_signup_session") as mock_session,
        patch("app.services.auth.signup.issue_otp", return_value="654321") as mock_issue,
        patch("app.services.auth.signup.gmail_otp_configured", return_value=True),
        patch("app.services.auth.signup.send_signup_otp_email") as mock_gmail,
    ):
        mock_session.return_value = {
            "email": "citizen@example.com",
            "phone_verified": True,
        }
        hint = await send_signup_email_otp(token)
        mock_issue.assert_awaited_once_with("signup_email", token)
        mock_gmail.assert_awaited_once_with(to="citizen@example.com", code="654321")
        assert hint is None


@pytest.mark.asyncio
async def test_send_signup_email_otp_returns_dev_code_when_gmail_disabled():
    from app.services.auth.signup import send_signup_email_otp

    token = "dev-email-token"
    with (
        patch("app.services.auth.signup.load_signup_session") as mock_session,
        patch("app.services.auth.signup.issue_otp", return_value="000000"),
        patch("app.services.auth.signup.gmail_otp_configured", return_value=False),
        patch("app.services.auth.signup.send_signup_otp_email") as mock_gmail,
    ):
        mock_session.return_value = {
            "email": "citizen@example.com",
            "phone_verified": True,
        }
        hint = await send_signup_email_otp(token)
        mock_gmail.assert_not_called()
        assert hint == "000000"
