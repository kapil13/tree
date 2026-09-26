"""Tests for GET /api/v1/auth/otp-config."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_otp_config_exposes_readiness_without_secrets(monkeypatch):
    monkeypatch.setattr(settings, "auth_otp_sms_enabled", True)
    monkeypatch.setattr(settings, "msg91_auth_key", "secret-key")
    monkeypatch.setattr(settings, "msg91_otp_template_id", "tpl-123")
    monkeypatch.setattr(settings, "msg91_signup_otp_template_id", "signup-tpl-456")
    monkeypatch.setattr(settings, "auth_otp_email_enabled", True)
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")
    monkeypatch.setattr(settings, "resend_from_email", "no-reply@aranyix.tech")
    monkeypatch.setattr(settings, "auth_org_invite_sms_enabled", False)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/auth/otp-config")

    assert res.status_code == 200
    body = res.json()
    assert body["sms_enabled"] is True
    assert body["sms_configured"] is True
    assert body["sms_template_configured"] is True
    assert body["sms_signup_template_configured"] is True
    assert body["email_enabled"] is True
    assert body["email_configured"] is True
    assert "auth_key" not in res.text
    assert "secret" not in res.text


@pytest.mark.asyncio
async def test_otp_config_when_sms_disabled(monkeypatch):
    monkeypatch.setattr(settings, "auth_otp_sms_enabled", False)
    monkeypatch.setattr(settings, "msg91_auth_key", None)
    monkeypatch.setattr(settings, "auth_otp_email_enabled", False)
    monkeypatch.setattr(settings, "resend_api_key", None)
    monkeypatch.setattr(settings, "resend_from_email", "no-reply@aranyix.tech")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/auth/otp-config")

    assert res.status_code == 200
    body = res.json()
    assert body["sms_configured"] is False
    assert body["email_configured"] is False
