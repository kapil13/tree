"""P2 security: payments idempotency, webhook secret, CAPTCHA, refresh rotation, RBAC, IDOR."""

from __future__ import annotations

import hashlib
import hmac
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.api.v1.deps import require_org_admin
from app.core.config import Settings
from app.core.production_guards import validate_runtime_settings
from app.core.security import create_refresh_token, decode_token
from app.services.auth.token_denylist import (
    clear_memory_denylist,
    is_jti_revoked,
    revoke_jti,
)
from app.services.payments.orders import mark_order_paid, record_webhook_event
from app.services.payments.razorpay_client import verify_webhook_signature
from app.services.planting_projects.access import can_access_project, load_project


def _prod_env(monkeypatch, **extra: str) -> Settings:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET", "a" * 32)
    monkeypatch.setenv("APP_DEBUG", "false")
    monkeypatch.delenv("AUTH_ALLOW_DEV_OTP", raising=False)
    monkeypatch.setenv("TURNSTILE_SITE_KEY", "site")
    monkeypatch.setenv("TURNSTILE_SECRET_KEY", "secret")
    for key, value in extra.items():
        monkeypatch.setenv(key, value)
    return Settings(_env_file=None)


def test_production_boot_requires_captcha(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET", "a" * 32)
    monkeypatch.setenv("APP_DEBUG", "false")
    monkeypatch.delenv("AUTH_ALLOW_DEV_OTP", raising=False)
    monkeypatch.delenv("TURNSTILE_SITE_KEY", raising=False)
    monkeypatch.delenv("TURNSTILE_SECRET_KEY", raising=False)
    s = Settings(_env_file=None)
    monkeypatch.setattr("app.core.production_guards.settings", s)
    with pytest.raises(RuntimeError, match="TURNSTILE"):
        validate_runtime_settings()


def test_production_boot_requires_webhook_secret_when_payments_enabled(monkeypatch):
    s = _prod_env(
        monkeypatch,
        RAZORPAY_KEY_ID="rzp_test",
        RAZORPAY_KEY_SECRET="key_secret",
    )
    monkeypatch.delenv("RAZORPAY_WEBHOOK_SECRET", raising=False)
    s = Settings(_env_file=None)
    monkeypatch.setattr("app.core.production_guards.settings", s)
    with pytest.raises(RuntimeError, match="RAZORPAY_WEBHOOK_SECRET"):
        validate_runtime_settings()


def test_production_boot_ok_with_captcha_and_no_payments(monkeypatch):
    s = _prod_env(monkeypatch)
    monkeypatch.delenv("RAZORPAY_KEY_ID", raising=False)
    monkeypatch.delenv("RAZORPAY_KEY_SECRET", raising=False)
    s = Settings(_env_file=None)
    monkeypatch.setattr("app.core.production_guards.settings", s)
    validate_runtime_settings()


def test_webhook_signature_rejects_key_secret_fallback_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET", "a" * 32)
    monkeypatch.setenv("APP_DEBUG", "false")
    monkeypatch.setenv("TURNSTILE_SITE_KEY", "site")
    monkeypatch.setenv("TURNSTILE_SECRET_KEY", "secret")
    monkeypatch.delenv("RAZORPAY_WEBHOOK_SECRET", raising=False)
    s = Settings(_env_file=None)
    monkeypatch.setattr("app.services.payments.razorpay_client.settings", s)
    monkeypatch.setattr("app.core.production_guards.settings", s)
    body = b'{"event":"payment.captured"}'
    signature = hmac.new(b"key_secret", body, hashlib.sha256).hexdigest()
    monkeypatch.setattr(s, "razorpay_key_secret", "key_secret")
    monkeypatch.setattr(s, "razorpay_webhook_secret", None)
    assert verify_webhook_signature(body, signature) is False


def test_webhook_signature_accepts_dedicated_secret(monkeypatch):
    from app.core.config import settings as live

    monkeypatch.setattr(live, "razorpay_webhook_secret", "whsec_test")
    monkeypatch.setattr(live, "razorpay_key_secret", "key_secret")
    body = b'{"event":"payment.captured"}'
    signature = hmac.new(b"whsec_test", body, hashlib.sha256).hexdigest()
    assert verify_webhook_signature(body, signature) is True


@pytest.mark.asyncio
async def test_mark_order_paid_is_idempotent(monkeypatch):
    order_id = uuid.uuid4()
    user_id = uuid.uuid4()
    locked = MagicMock(
        id=order_id,
        user_id=user_id,
        status="paid",
        credits_granted=5,
        razorpay_payment_id="pay_1",
    )
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=locked)
    db = AsyncMock()
    db.execute = AsyncMock(return_value=result)
    db.flush = AsyncMock()
    credit = AsyncMock()
    monkeypatch.setattr("app.services.payments.orders.credit_scans", credit)

    out = await mark_order_paid(db, order=locked, razorpay_payment_id="pay_2")
    assert out is locked
    assert locked.status == "paid"
    credit.assert_not_awaited()


@pytest.mark.asyncio
async def test_mark_order_paid_credits_once_on_transition(monkeypatch):
    order_id = uuid.uuid4()
    user_id = uuid.uuid4()
    locked = MagicMock(
        id=order_id,
        user_id=user_id,
        status="created",
        credits_granted=10,
        razorpay_payment_id=None,
        paid_at=None,
    )
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=locked)
    db = AsyncMock()
    db.execute = AsyncMock(return_value=result)
    db.flush = AsyncMock()
    credit = AsyncMock()
    monkeypatch.setattr("app.services.payments.orders.credit_scans", credit)

    out = await mark_order_paid(db, order=locked, razorpay_payment_id="pay_new")
    assert out is locked
    assert locked.status == "paid"
    assert locked.razorpay_payment_id == "pay_new"
    credit.assert_awaited_once_with(db, user_id, 10)


@pytest.mark.asyncio
async def test_record_webhook_event_returns_none_on_duplicate():
    existing = MagicMock()
    existing.scalar_one_or_none = MagicMock(return_value=MagicMock())
    db = AsyncMock()
    db.execute = AsyncMock(return_value=existing)
    out = await record_webhook_event(
        db, event_id="evt_1", event_type="payment.captured", payload={"id": "evt_1"}
    )
    assert out is None
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_refresh_jti_rotation_denylist():
    clear_memory_denylist()
    token = create_refresh_token(uuid.uuid4())
    data = decode_token(token)
    jti = data["jti"]
    assert await is_jti_revoked(jti) is False
    await revoke_jti(jti, expires_at=data["exp"])
    assert await is_jti_revoked(jti) is True


@pytest.mark.asyncio
async def test_org_admin_required_for_webhook_mutations():
    member = MagicMock(
        role="government",
        organization_id=uuid.uuid4(),
        is_org_admin=False,
    )
    with pytest.raises(Exception) as exc:
        await require_org_admin(member)
    assert exc.value.status_code == 403
    assert exc.value.detail == "org_admin_required"


@pytest.mark.asyncio
async def test_idor_foreign_project_not_accessible():
    org_a = uuid.uuid4()
    org_b = uuid.uuid4()
    user = MagicMock(id=uuid.uuid4(), role="government", organization_id=org_a)
    project = MagicMock(
        id=uuid.uuid4(),
        owner_user_id=uuid.uuid4(),
        organization_id=org_b,
    )
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None))
    )
    assert await can_access_project(user, project, db) is False


@pytest.mark.asyncio
async def test_idor_load_project_returns_none_for_foreign_org(monkeypatch):
    user = MagicMock(id=uuid.uuid4(), role="ngo", organization_id=uuid.uuid4())
    foreign = MagicMock(
        id=uuid.uuid4(),
        owner_user_id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
    )
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=foreign))
    )
    monkeypatch.setattr(
        "app.services.planting_projects.access.can_access_project",
        AsyncMock(return_value=False),
    )
    assert await load_project(foreign.id, user, db) is None


@pytest.mark.asyncio
async def test_idor_payment_order_scoped_to_user(monkeypatch):
    from app.services.payments.orders import get_order_for_user

    user_id = uuid.uuid4()
    order_id = uuid.uuid4()
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None))
    )
    assert await get_order_for_user(db, user_id=user_id, order_id=order_id) is None
