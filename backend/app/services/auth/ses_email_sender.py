"""Amazon SES for auth email OTP (login, signup, password reset)."""

from __future__ import annotations

import asyncio
from typing import Any

try:
    import boto3
except Exception:  # pragma: no cover
    boto3 = None

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("auth.ses")


class EmailSendError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def ses_otp_configured() -> bool:
    """True when SES can send auth OTP emails in this environment."""
    return bool(
        settings.auth_otp_email_enabled
        and settings.ses_sender
        and settings.aws_access_key_id
        and settings.aws_secret_access_key
        and boto3 is not None
    )


def _ses_client():
    if boto3 is None:
        raise EmailSendError("email_dependencies_missing")
    if not settings.aws_access_key_id or not settings.aws_secret_access_key:
        raise EmailSendError("email_otp_not_configured")
    return boto3.client(
        "ses",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )


def _send_email_sync(*, to: str, subject: str, body: str) -> None:
    sender = (settings.ses_sender or "").strip()
    if not sender:
        raise EmailSendError("email_otp_not_configured")
    try:
        client = _ses_client()
        client.send_email(
            Source=sender,
            Destination={"ToAddresses": [to]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {"Text": {"Data": body, "Charset": "UTF-8"}},
            },
        )
    except EmailSendError:
        raise
    except Exception as exc:
        log.warning("ses.email_failed", to=_redact_email(to), error=str(exc))
        raise EmailSendError("email_send_failed") from exc


def _otp_email_body(code: str) -> str:
    return (
        f"Your Aranyix verification code is {code}.\n\n"
        "This code expires in 10 minutes. If you did not request this, you can ignore this email."
    )


async def send_auth_otp_email(*, to: str, code: str) -> None:
    if not ses_otp_configured():
        raise EmailSendError("email_otp_not_configured")
    await asyncio.to_thread(
        _send_email_sync,
        to=to,
        subject="Your Aranyix sign-in code",
        body=_otp_email_body(code),
    )
    log.info("ses.auth_otp_sent", to=_redact_email(to))


async def send_signup_otp_email(*, to: str, code: str) -> None:
    if not ses_otp_configured():
        raise EmailSendError("email_otp_not_configured")
    await asyncio.to_thread(
        _send_email_sync,
        to=to,
        subject="Your Aranyix verification code",
        body=_otp_email_body(code),
    )
    log.info("ses.signup_otp_sent", to=_redact_email(to))


async def send_password_reset_otp_email(*, to: str, code: str) -> None:
    if not ses_otp_configured():
        raise EmailSendError("email_otp_not_configured")
    body = (
        f"Your Aranyix password reset code is {code}.\n\n"
        "This code expires in 10 minutes. If you did not request a password reset, "
        "you can ignore this email."
    )
    await asyncio.to_thread(
        _send_email_sync,
        to=to,
        subject="Reset your Aranyix password",
        body=body,
    )
    log.info("ses.password_reset_sent", to=_redact_email(to))


def ses_public_config() -> dict[str, Any]:
    return {
        "email_provider": "ses",
        "email_configured": ses_otp_configured(),
        "ses_sender": bool(settings.ses_sender),
        "aws_credentials": bool(settings.aws_access_key_id and settings.aws_secret_access_key),
    }


def _redact_email(email: str) -> str:
    user, _, domain = email.partition("@")
    if not domain:
        return "***"
    return f"{user[:2]}***@{domain}"
