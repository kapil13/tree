"""Platform Foundation Phase E — RLS, trace_id, production guards."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.deps import get_current_user
from app.core.production_guards import validate_runtime_settings
from app.core.rls import apply_rls_to_session, clear_rls_context, set_rls_context
from app.main import app


def _user(**kwargs):
    defaults = {
        "id": uuid.uuid4(),
        "role": "government",
        "organization_id": uuid.uuid4(),
        "is_org_admin": False,
        "is_active": True,
        "org_role": "manager",
        "sessions_invalidated_at": None,
    }
    defaults.update(kwargs)
    return MagicMock(**defaults)


@pytest.mark.asyncio
async def test_trace_id_header_on_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health/live")
    assert res.status_code == 200
    assert res.headers.get("x-trace-id")


@pytest.mark.asyncio
async def test_error_response_includes_trace_id():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/no-such-route")
    assert res.status_code == 404
    body = res.json()
    assert body["error"]["trace_id"]
    assert res.headers.get("x-trace-id") == body["error"]["trace_id"]


@pytest.mark.asyncio
async def test_apply_rls_sets_guc():
    db = AsyncMock()
    set_rls_context(
        user_id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        role="user",
    )
    await apply_rls_to_session(db)
    db.execute.assert_awaited()
    clear_rls_context()


@pytest.mark.asyncio
async def test_webhook_foreign_org_delete_returns_404():
    user = _user(is_org_admin=True)
    foreign_webhook_id = uuid.uuid4()
    foreign = MagicMock(organization_id=uuid.uuid4(), id=foreign_webhook_id, label="x")

    async def _current_user():
        return user

    db = AsyncMock()
    db.get = AsyncMock(return_value=foreign)

    from app.api.v1 import deps

    async def _db():
        return db

    app.dependency_overrides[get_current_user] = _current_user
    app.dependency_overrides[deps.get_db] = _db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.delete(f"/api/v1/webhooks/{foreign_webhook_id}")

    app.dependency_overrides.clear()
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_privacy_export_requires_auth():
    from app.api.v1 import deps

    async def _db():
        yield AsyncMock()

    app.dependency_overrides[deps.get_db] = _db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/privacy/data-export")
    app.dependency_overrides.clear()
    assert res.status_code == 401
    assert res.json()["error"]["trace_id"]


def test_production_rejects_exposed_docs(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET", "a" * 32)
    monkeypatch.setenv("APP_DEBUG", "false")
    monkeypatch.setenv("EXPOSE_API_DOCS", "true")
    monkeypatch.setenv("EXPOSE_METRICS", "false")
    monkeypatch.delenv("AUTH_ALLOW_DEV_OTP", raising=False)
    monkeypatch.setenv("TURNSTILE_SITE_KEY", "site")
    monkeypatch.setenv("TURNSTILE_SECRET_KEY", "secret")
    monkeypatch.setenv("AUTH_OTP_SMS_ENABLED", "true")
    monkeypatch.setenv("MSG91_AUTH_KEY", "key")
    monkeypatch.setenv("MSG91_OTP_TEMPLATE_ID", "login")
    monkeypatch.setenv("MSG91_SIGNUP_OTP_TEMPLATE_ID", "signup")
    monkeypatch.setenv(
        "EVIDENCE_SIGNING_KEY",
        "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=",
    )
    from app.core.config import Settings

    s = Settings(_env_file=None)
    monkeypatch.setattr("app.core.production_guards.settings", s)
    with pytest.raises(RuntimeError, match="EXPOSE_API_DOCS"):
        validate_runtime_settings()
