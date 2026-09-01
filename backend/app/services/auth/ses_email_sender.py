"""Backward-compatible auth email sender (delegates to Resend email service)."""

from __future__ import annotations

from typing import Any

from app.services.email import (
    EmailSendError,
    email_otp_configured,
    email_public_config,
    send_login_otp,
    send_password_reset,
    send_verification_otp,
)

__all__ = [
    "EmailSendError",
    "send_auth_otp_email",
    "send_password_reset_otp_email",
    "send_signup_otp_email",
    "ses_otp_configured",
    "ses_public_config",
]


def ses_otp_configured() -> bool:
    """True when Resend can send auth OTP emails in this environment."""
    return email_otp_configured()


async def send_auth_otp_email(*, to: str, code: str) -> None:
    await send_login_otp(to=to, code=code)


async def send_signup_otp_email(*, to: str, code: str) -> None:
    await send_verification_otp(to=to, code=code)


async def send_password_reset_otp_email(*, to: str, code: str) -> None:
    await send_password_reset(to=to, code=code)


def ses_public_config() -> dict[str, Any]:
    config = email_public_config()
    return {
        "email_provider": config["email_provider"],
        "email_configured": config["email_configured"],
        "resend_api_key": config["resend_api_key"],
        "resend_from_email": config["resend_from_email"],
    }
