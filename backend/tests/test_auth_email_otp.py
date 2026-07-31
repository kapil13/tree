"""Login email OTP request sends via Gmail when configured."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_request_otp_email_sends_gmail():
    with (
        patch("app.api.v1.auth.verify_captcha_token", new_callable=AsyncMock),
        patch("app.api.v1.auth.issue_otp", new_callable=AsyncMock, return_value="123456"),
        patch("app.api.v1.auth.gmail_otp_configured", return_value=True),
        patch("app.api.v1.auth.send_auth_otp_email", new_callable=AsyncMock) as mock_send,
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/api/v1/auth/otp/request",
                json={"email": "user@example.com", "captcha_token": "ok"},
            )
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "sent"
        assert body.get("dev_hint") is None
        mock_send.assert_awaited_once_with(to="user@example.com", code="123456")


@pytest.mark.asyncio
async def test_request_otp_email_returns_dev_hint_when_gmail_disabled():
    with (
        patch("app.api.v1.auth.verify_captcha_token", new_callable=AsyncMock),
        patch("app.api.v1.auth.issue_otp", new_callable=AsyncMock, return_value="654321"),
        patch("app.api.v1.auth.gmail_otp_configured", return_value=False),
        patch("app.api.v1.auth.settings") as mock_settings,
    ):
        mock_settings.auth_otp_email_enabled = True
        mock_settings.allow_dev_otp = True
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/api/v1/auth/otp/request",
                json={"email": "user@example.com", "captcha_token": "ok"},
            )
        assert res.status_code == 200
        assert res.json().get("dev_hint") == "654321"
