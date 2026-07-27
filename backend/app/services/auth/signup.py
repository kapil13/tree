"""Phase 1 citizen signup: phone + email OTP, BYOT-only enrollment."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User
from app.services.auth.gmail_sender import (
    GmailSendError,
    gmail_otp_configured,
    send_signup_otp_email,
)
from app.services.auth.msg91_sender import SmsSendError, send_auth_otp_sms, sms_auth_configured
from app.services.auth.otp import normalize_phone, otp_dev_hint
from app.services.auth.otp_store import (
    check_otp,
    delete_signup_session,
    issue_otp,
    load_signup_session,
    save_signup_session,
    update_signup_session,
)
from app.services.planting_programs.access_requests import AccessRequestError
from app.services.planting_programs.enrollment import ensure_default_enrollment
from app.services.planting_programs.onboarding import (
    create_draft_access_request,
    resolve_signup_program_code,
)
from app.services.planting_programs.signup_categories import (
    SIGNUP_CATEGORY_BYOT,
    normalize_signup_category,
)


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
    signup_category: str | None = None,
) -> tuple[str, str | None]:
    """Create a pending signup session and send phone OTP. Returns (signup_token, dev_otp)."""
    normalized_phone = normalize_phone(phone)
    email_lower = email.strip().lower()
    category = normalize_signup_category(signup_category)
    try:
        resolve_signup_program_code(category)
    except AccessRequestError as exc:
        raise SignupError(exc.code) from exc

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
            "signup_category": category,
        },
    )
    if not sms_auth_configured() and not settings.allow_dev_otp:
        raise SignupError("sms_not_configured")

    dev_code = await issue_otp("signup_phone", token)
    if sms_auth_configured():
        try:
            await send_auth_otp_sms(phone=normalized_phone, code=dev_code)
            return token, None
        except SmsSendError as exc:
            if not settings.allow_dev_otp:
                raise SignupError("sms_send_failed") from exc
            return token, otp_dev_hint(dev_code)
    return token, otp_dev_hint(dev_code)


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
    if not gmail_otp_configured() and not settings.allow_dev_otp:
        raise SignupError("gmail_not_configured")

    code = await issue_otp("signup_email", signup_token)
    if gmail_otp_configured():
        try:
            await send_signup_otp_email(to=session["email"], code=code)
        except GmailSendError as exc:
            raise SignupError(exc.code) from exc
        return None
    return otp_dev_hint(code)


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

    program_code = resolve_signup_program_code(session.get("signup_category", SIGNUP_CATEGORY_BYOT))
    if program_code:
        try:
            await create_draft_access_request(db, user_id=user.id, program_code=program_code)
        except AccessRequestError as exc:
            if exc.code != "request_already_pending":
                raise SignupError(exc.code) from exc

    await delete_signup_session(signup_token)
    return user
