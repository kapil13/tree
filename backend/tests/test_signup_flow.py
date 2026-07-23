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


def test_self_service_program_filter():
    from app.services.planting_programs.catalog import default_program_code

    requested = ["byot", "government_nhai", "corporate_esg"]
    allowed = [c for c in requested if c == default_program_code()]
    assert allowed == ["byot"]
