"""Self-serve password reset via email OTP."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User
from app.services.auth.ses_email_sender import (
    EmailSendError,
    send_password_reset_otp_email,
    ses_otp_configured,
)
from app.services.auth.otp import otp_dev_hint
from app.services.auth.otp_store import check_otp, issue_otp


class PasswordResetError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


async def request_password_reset(db: AsyncSession, email: str) -> str | None:
    """Send a password-reset OTP when the account exists. Always appears successful."""
    email_lower = email.strip().lower()
    if not ses_otp_configured() and not settings.allow_dev_otp:
        raise PasswordResetError("email_otp_not_configured")

    user = (
        await db.execute(select(User).where(User.email == email_lower))
    ).scalar_one_or_none()
    if user is None:
        return None

    code = await issue_otp("password_reset", email_lower)
    if ses_otp_configured():
        try:
            await send_password_reset_otp_email(to=email_lower, code=code)
        except EmailSendError as exc:
            if not settings.allow_dev_otp:
                raise PasswordResetError(exc.code) from exc
            return otp_dev_hint(code)
        return None
    return otp_dev_hint(code)


async def confirm_password_reset(
    db: AsyncSession,
    *,
    email: str,
    code: str,
    password: str,
) -> User:
    email_lower = email.strip().lower()
    if not await check_otp("password_reset", email_lower, code):
        raise PasswordResetError("invalid_otp")

    user = (
        await db.execute(select(User).where(User.email == email_lower))
    ).scalar_one_or_none()
    if user is None:
        raise PasswordResetError("invalid_otp")

    user.hashed_password = hash_password(password)
    user.is_active = True
    user.is_verified = True
    await db.flush()
    return user
