"""Platform admin support actions — password reset, verification, sessions."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User
from app.services.auth.gmail_sender import (
    GmailSendError,
    gmail_otp_configured,
    send_signup_otp_email,
)
from app.services.auth.otp import otp_dev_hint
from app.services.auth.otp_store import issue_otp
from app.services.auth.password_reset import PasswordResetError, request_password_reset
from app.services.auth.sessions import revoke_all_user_sessions


class SupportActionError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


async def admin_force_password_reset(db: AsyncSession, user: User) -> str | None:
    """Send a password-reset OTP to the user. Returns dev hint when configured."""
    try:
        return await request_password_reset(db, user.email)
    except PasswordResetError as exc:
        raise SupportActionError(exc.code) from exc


async def admin_resend_verification(
    db: AsyncSession,
    user: User,
    *,
    mark_verified: bool = False,
) -> str | None:
    """Resend email verification OTP, or mark the account verified (admin override)."""
    if mark_verified:
        now = datetime.now(UTC)
        user.is_verified = True
        user.email_verified_at = now
        await db.flush()
        return None

    if user.is_verified and user.email_verified_at is not None:
        raise SupportActionError("already_verified")

    if not gmail_otp_configured() and not settings.allow_dev_otp:
        raise SupportActionError("email_otp_not_configured")

    code = await issue_otp("signup_email", user.email)
    if gmail_otp_configured():
        try:
            await send_signup_otp_email(to=user.email, code=code)
        except GmailSendError as exc:
            if not settings.allow_dev_otp:
                raise SupportActionError(exc.code) from exc
            return otp_dev_hint(code)
        return None
    return otp_dev_hint(code)


def admin_revoke_sessions(user: User) -> datetime:
    """Invalidate all existing tokens for the user."""
    return revoke_all_user_sessions(user)
