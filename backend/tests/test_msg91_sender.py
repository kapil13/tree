"""Tests for MSG91 SMS sender stubs and configuration."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.auth.msg91_sender import (
    SmsSendError,
    _normalize_mobile,
    msg91_public_config,
    send_auth_otp_sms,
    send_signup_otp_sms,
    send_transactional_sms,
    sms_auth_configured,
    sms_auth_template_configured,
    sms_invites_configured,
    sms_signup_otp_configured,
)


def test_sms_auth_configured_requires_key_and_flag():
    with patch("app.services.auth.msg91_sender.settings") as mock_settings:
        mock_settings.auth_otp_sms_enabled = True
        mock_settings.msg91_auth_key = "secret"
        assert sms_auth_configured() is True

        mock_settings.auth_otp_sms_enabled = False
        assert sms_auth_configured() is False


def test_sms_auth_template_configured():
    with patch("app.services.auth.msg91_sender.settings") as mock_settings:
        mock_settings.auth_otp_sms_enabled = True
        mock_settings.msg91_auth_key = "secret"
        mock_settings.msg91_otp_template_id = "tpl-1"
        assert sms_auth_template_configured() is True

        mock_settings.msg91_otp_template_id = None
        assert sms_auth_template_configured() is False


def test_sms_signup_otp_configured():
    with patch("app.services.auth.msg91_sender.settings") as mock_settings:
        mock_settings.auth_otp_sms_enabled = True
        mock_settings.msg91_auth_key = "secret"
        mock_settings.msg91_signup_otp_template_id = "signup-tpl-1"
        assert sms_signup_otp_configured() is True

        mock_settings.msg91_signup_otp_template_id = None
        assert sms_signup_otp_configured() is False


def test_msg91_public_config():
    with patch("app.services.auth.msg91_sender.settings") as mock_settings:
        mock_settings.auth_otp_sms_enabled = True
        mock_settings.msg91_auth_key = "secret"
        mock_settings.msg91_otp_template_id = "tpl"
        mock_settings.msg91_signup_otp_template_id = "signup-tpl"
        mock_settings.auth_org_invite_sms_enabled = True
        cfg = msg91_public_config()
    assert cfg["sms_configured"] is True
    assert cfg["sms_template_configured"] is True
    assert cfg["sms_signup_template_configured"] is True
    assert cfg["invite_sms_configured"] is True


def test_normalize_mobile_india():
    assert _normalize_mobile("+919876543210") == "919876543210"
    assert _normalize_mobile("9876543210") == "919876543210"
    assert _normalize_mobile("919876543210") == "919876543210"


def test_validate_msg91_mobile_rejects_placeholders():
    with pytest.raises(SmsSendError, match="invalid_mobile"):
        from app.services.auth.msg91_sender import _validate_msg91_mobile

        _validate_msg91_mobile("10")  # from "YOUR_10_DIGIT_PHONE"


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
    call_kwargs = mock_client.post.await_args.kwargs
    payload = call_kwargs["json"]
    assert payload["mobile"] == "919876543210"
    assert payload["otp"] == "654321"
    assert payload["sender"] == "ARANYX"


@pytest.mark.asyncio
async def test_send_auth_otp_sms_includes_template_id():
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
        mock_settings.msg91_otp_template_id = "otp-template-99"
        mock_settings.msg91_sender_id = "ARANYX"
        await send_auth_otp_sms(phone="9876543210", code="111111")

    payload = mock_client.post.await_args.kwargs["json"]
    assert payload["template_id"] == "otp-template-99"


@pytest.mark.asyncio
async def test_send_signup_otp_sms_uses_signup_template_id():
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
        mock_settings.msg91_signup_otp_template_id = "signup-template-42"
        mock_settings.msg91_sender_id = "ARANYX"
        await send_signup_otp_sms(phone="9876543210", code="222222")

    payload = mock_client.post.await_args.kwargs["json"]
    assert payload["template_id"] == "signup-template-42"


@pytest.mark.asyncio
async def test_send_auth_otp_sms_raises_on_msg91_error_body():
    mock_response = MagicMock(status_code=200, text='{"type":"error","message":"Invalid mobile number"}')
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
        mock_settings.msg91_otp_template_id = "tpl"
        mock_settings.msg91_sender_id = "AXTECP"
        with pytest.raises(SmsSendError, match="msg91_otp_rejected"):
            await send_auth_otp_sms(phone="9876543210", code="123456")


@pytest.mark.asyncio
async def test_send_auth_otp_sms_rejects_invalid_mobile():
    with (
        patch("app.services.auth.msg91_sender.sms_auth_configured", return_value=True),
        pytest.raises(SmsSendError, match="invalid_mobile"),
    ):
        await send_auth_otp_sms(phone="YOUR_10_DIGIT_PHONE", code="123456")


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
