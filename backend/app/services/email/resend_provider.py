"""Resend API email delivery."""

from __future__ import annotations

import asyncio

try:
    import resend
except Exception:  # pragma: no cover
    resend = None

from app.core.config import settings
from app.core.logging import get_logger
from app.services.email.exceptions import EmailSendError

log = get_logger("email.resend")


def _from_address() -> str:
    email = (settings.resend_from_email or "").strip()
    name = (settings.resend_from_name or "Aranyix").strip()
    if not email:
        raise EmailSendError("email_not_configured")
    return f"{name} <{email}>"


def send_email_sync(
    *,
    to: str,
    subject: str,
    html: str,
    text: str | None = None,
) -> None:
    if resend is None:
        raise EmailSendError("email_dependencies_missing")
    api_key = (settings.resend_api_key or "").strip()
    if not api_key:
        raise EmailSendError("email_not_configured")

    resend.api_key = api_key
    payload: resend.Emails.SendParams = {
        "from": _from_address(),
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text

    try:
        resend.Emails.send(payload)
    except EmailSendError:
        raise
    except Exception as exc:
        log.warning("resend.send_failed", to=_redact_email(to), error=str(exc))
        raise EmailSendError("email_send_failed") from exc


async def send_email(
    *,
    to: str,
    subject: str,
    html: str,
    text: str | None = None,
) -> None:
    await asyncio.to_thread(
        send_email_sync,
        to=to,
        subject=subject,
        html=html,
        text=text,
    )


def _redact_email(email: str) -> str:
    user, _, domain = email.partition("@")
    if not domain:
        return "***"
    return f"{user[:2]}***@{domain}"
