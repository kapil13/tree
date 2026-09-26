"""Tests for Phase 1 BYOT signup flow."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.auth.otp_store import (
    issue_otp,
    load_signup_session,
    save_signup_session,
)
from app.services.auth.signup import SignupError, verify_signup_phone


@pytest.mark.asyncio
async def test_signup_phone_verification_roundtrip():
    token = "test-signup-token"
    await save_signup_session(
        token,
        {
            "full_name": "Citizen User",
            "email": "citizen@example.com",
            "phone": "+919876543210",
            "password_hash": "hashed",
            "phone_verified": False,
            "email_verified": False,
        },
    )
    await issue_otp("signup_phone", token)
    await verify_signup_phone(token, "000000")
    session = await load_signup_session(token)
    assert session is not None
    assert session["phone_verified"] is True


@pytest.mark.asyncio
async def test_signup_start_rejects_duplicate_email():
    from app.services.auth.signup import start_signup

    db = MagicMock()
    db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value="existing")))

    with pytest.raises(SignupError) as exc:
        await start_signup(
            db,
            full_name="Citizen User",
            email="citizen@example.com",
            phone="9876543210",
            password="securepassword12",
        )
    assert exc.value.code == "email_taken"


@pytest.mark.asyncio
async def test_signup_invalid_phone_otp():
    token = "bad-token"
    await save_signup_session(
        token,
        {
            "full_name": "Citizen User",
            "email": "citizen@example.com",
            "phone": "+919876543210",
            "password_hash": "hashed",
            "phone_verified": False,
            "email_verified": False,
        },
    )
    with pytest.raises(SignupError) as exc:
        await verify_signup_phone(token, "123456")
    assert exc.value.code == "invalid_otp"


@pytest.mark.asyncio
async def test_complete_signup_requires_phone_verified():
    from app.services.auth.signup import SignupError, complete_signup

    token = "unverified-phone-token"
    await save_signup_session(
        token,
        {
            "full_name": "Citizen User",
            "email": "citizen@example.com",
            "phone": "+919876543210",
            "password_hash": "hashed",
            "phone_verified": False,
            "email_verified": False,
            "signup_category": "byot",
        },
    )
    await issue_otp("signup_email", token)
    db = MagicMock()
    with pytest.raises(SignupError) as exc:
        await complete_signup(db, token, "000000")
    assert exc.value.code == "phone_not_verified"


@pytest.mark.asyncio
async def test_register_endpoint_disabled_in_production(monkeypatch):
    from fastapi import HTTPException

    from app.api.v1.auth import register
    from app.core.config import settings
    from app.schemas.auth import RegisterRequest

    monkeypatch.setattr(settings, "app_env", "production")
    request = MagicMock()
    db = MagicMock()
    payload = RegisterRequest(
        email="new@example.com",
        password="securepassword12",
        full_name="New User",
    )
    with pytest.raises(HTTPException) as exc:
        await register(payload, request, db)
    assert exc.value.status_code == 410
    assert exc.value.detail == "use_signup_otp_flow"


@pytest.mark.asyncio
async def test_complete_signup_applies_signup_category_from_request():
    from unittest.mock import patch

    from app.services.auth.signup import complete_signup

    token = "category-at-complete-token"
    await save_signup_session(
        token,
        {
            "full_name": "Gov User",
            "email": "gov@example.com",
            "phone": "+919876543211",
            "password_hash": "hashed",
            "phone_verified": True,
            "email_verified": False,
            "signup_category": None,
        },
    )
    await issue_otp("signup_email", token)

    db = MagicMock()
    db.add = MagicMock()
    db.flush = AsyncMock()
    create_mock = AsyncMock()

    with (
        patch("app.services.auth.signup.ensure_default_enrollment", new_callable=AsyncMock),
        patch("app.services.auth.signup.create_draft_access_request", create_mock),
        patch("app.services.auth.signup.delete_signup_session", new_callable=AsyncMock),
    ):
        user = await complete_signup(
            db,
            token,
            "000000",
            signup_category="government_nhai",
        )

    assert user.email == "gov@example.com"
    create_mock.assert_awaited_once()
    assert create_mock.await_args.kwargs["program_code"] == "government_nhai"


def test_self_service_program_filter():
    from app.services.planting_programs.catalog import default_program_code

    requested = ["byot", "government_nhai", "corporate_esg"]
    allowed = [c for c in requested if c == default_program_code()]
    assert allowed == ["byot"]
