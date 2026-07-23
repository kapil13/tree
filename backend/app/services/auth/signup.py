"""Phase 1 citizen signup: phone + email OTP, BYOT-only enrollment."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User
from app.services.auth.otp import normalize_phone
from app.services.auth.otp_store import (
    check_otp,
    delete_signup_session,
    issue_otp,
    load_signup_session,
    save_signup_session,
    update_signup_session,
)
from app.services.planting_programs.enrollment import ensure_default_enrollment


class SignupError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


async def start_signup(
    db: AsyncSession,
    *,
    full_name: str,
    email: str,
    phone: str,
    password: str,
) -> tuple[str, str | None]:
    """Create a pending signup session and send phone OTP. Returns (signup_token, dev_otp)."""
    normalized_phone = normalize_phone(phone)
    email_lower = email.strip().lower()

    existing_email = await db.execute(select(User.id).where(User.email == email_lower))
    if existing_email.scalar_one_or_none():
        raise SignupError("email_taken")

    existing_phone = await db.execute(select(User.id).where(User.phone == normalized_phone))
    if existing_phone.scalar_one_or_none():
        raise SignupError("phone_taken")

    token = str(uuid.uuid4())
    await save_signup_session(
        token,
        {
            "full_name": full_name.strip(),
            "email": email_lower,
            "phone": normalized_phone,
            "password_hash": hash_password(password),
            "phone_verified": False,
            "email_verified": False,
        },
    )
    dev_code = await issue_otp("signup_phone", token)
    dev_hint = dev_code if not settings.auth_otp_sms_enabled else None
    return token, dev_hint


async def verify_signup_phone(signup_token: str, code: str) -> None:
    session = await load_signup_session(signup_token)
    if session is None:
        raise SignupError("signup_session_expired")
    if not await check_otp("signup_phone", signup_token, code):
        raise SignupError("invalid_otp")
    await update_signup_session(signup_token, {"phone_verified": True})


async def send_signup_email_otp(signup_token: str) -> str | None:
    session = await load_signup_session(signup_token)
    if session is None:
        raise SignupError("signup_session_expired")
    if not session.get("phone_verified"):
        raise SignupError("phone_not_verified")
    dev_code = await issue_otp("signup_email", signup_token)
    return dev_code if not settings.auth_otp_sms_enabled else None


async def complete_signup(db: AsyncSession, signup_token: str, email_code: str) -> User:
    session = await load_signup_session(signup_token)
    if session is None:
        raise SignupError("signup_session_expired")
    if not session.get("phone_verified"):
        raise SignupError("phone_not_verified")
    if not await check_otp("signup_email", signup_token, email_code):
        raise SignupError("invalid_otp")

    now = datetime.now(UTC)
    user = User(
        email=session["email"],
        phone=session["phone"],
        full_name=session["full_name"],
        hashed_password=session["password_hash"],
        role="user",
        is_active=True,
        is_verified=True,
        phone_verified_at=now,
        email_verified_at=now,
    )
    db.add(user)
    await db.flush()
    await ensure_default_enrollment(db, user.id)
    await delete_signup_session(signup_token)
    return user
