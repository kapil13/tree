"""Tests for MSG91 SMS sender stubs and configuration."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.auth.msg91_sender import (
    SmsSendError,
    send_auth_otp_sms,
    send_transactional_sms,
    sms_auth_configured,
    sms_invites_configured,
)


def test_sms_auth_configured_requires_key_and_flag():
    with patch("app.services.auth.msg91_sender.settings") as mock_settings:
        mock_settings.auth_otp_sms_enabled = True
        mock_settings.msg91_auth_key = "secret"
        assert sms_auth_configured() is True

        mock_settings.auth_otp_sms_enabled = False
        assert sms_auth_configured() is False


def test_sms_invites_configured_requires_key_and_flag():
    with patch("app.services.auth.msg91_sender.settings") as mock_settings:
        mock_settings.auth_org_invite_sms_enabled = True
        mock_settings.msg91_auth_key = "secret"
        assert sms_invites_configured() is True

        mock_settings.msg91_auth_key = None
        assert sms_invites_configured() is False


@pytest.mark.asyncio
async def test_send_auth_otp_sms_stub_logs_without_keys():
    with patch("app.services.auth.msg91_sender.sms_auth_configured", return_value=False):
        sent = await send_auth_otp_sms(phone="+919876543210", code="123456")
    assert sent is False


@pytest.mark.asyncio
async def test_send_auth_otp_sms_posts_when_configured():
    mock_response = MagicMock(status_code=200, text="ok")
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with (
        patch("app.services.auth.msg91_sender.sms_auth_configured", return_value=True),
        patch("app.services.auth.msg91_sender.settings") as mock_settings,
        patch("app.services.auth.msg91_sender.httpx.AsyncClient", return_value=mock_client),
    ):
        mock_settings.msg91_auth_key = "key"
        mock_settings.msg91_otp_template_id = None
        mock_settings.msg91_sender_id = "ARANYX"
        sent = await send_auth_otp_sms(phone="+919876543210", code="654321")

    assert sent is True
    mock_client.post.assert_awaited_once()


@pytest.mark.asyncio
async def test_send_transactional_sms_raises_on_http_error():
    mock_response = MagicMock(status_code=500, text="error")
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with (
        patch("app.services.auth.msg91_sender.sms_invites_configured", return_value=True),
        patch("app.services.auth.msg91_sender.settings") as mock_settings,
        patch("app.services.auth.msg91_sender.httpx.AsyncClient", return_value=mock_client),
    ):
        mock_settings.msg91_auth_key = "key"
        mock_settings.msg91_invite_template_id = None
        mock_settings.msg91_sender_id = "ARANYX"
        mock_settings.sns_sms_sender_id = "BYOT"
        with pytest.raises(SmsSendError) as exc:
            await send_transactional_sms(phone="+919876543210", message="Join us")
    assert exc.value.code == "msg91_sms_failed"
