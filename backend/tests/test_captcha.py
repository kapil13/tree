"""Tests for Turnstile CAPTCHA verification."""

import asyncio

import pytest
from fastapi import HTTPException

from app.services.auth.captcha import verify_captcha_token


def test_captcha_skipped_when_disabled(monkeypatch):
    monkeypatch.setattr("app.services.auth.captcha.settings.turnstile_secret_key", None)
    asyncio.run(verify_captcha_token(None))


def test_captcha_required_when_enabled(monkeypatch):
    monkeypatch.setattr("app.services.auth.captcha.settings.turnstile_secret_key", "secret")
    with pytest.raises(HTTPException) as exc:
        asyncio.run(verify_captcha_token(None))
    assert exc.value.detail == "captcha_required"


def test_captcha_success(monkeypatch):
    monkeypatch.setattr("app.services.auth.captcha.settings.turnstile_secret_key", "secret")

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"success": True}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, data):
            assert data["response"] == "valid-token"
            return FakeResponse()

    monkeypatch.setattr("app.services.auth.captcha.httpx.AsyncClient", lambda **kw: FakeClient())
    asyncio.run(verify_captcha_token("valid-token", remote_ip="1.2.3.4"))


def test_captcha_failure(monkeypatch):
    monkeypatch.setattr("app.services.auth.captcha.settings.turnstile_secret_key", "secret")

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"success": False}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, url, data):
            return FakeResponse()

    monkeypatch.setattr("app.services.auth.captcha.httpx.AsyncClient", lambda **kw: FakeClient())
    with pytest.raises(HTTPException) as exc:
        asyncio.run(verify_captcha_token("bad-token"))
    assert exc.value.detail == "captcha_failed"
