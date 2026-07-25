"""Send transactional email via Gmail API (Google Workspace domain delegation)."""

from __future__ import annotations

import asyncio
import base64
import json
from email.mime.text import MIMEText
from pathlib import Path

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("auth.gmail")

GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"


class GmailSendError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def gmail_otp_configured() -> bool:
    return bool(
        settings.auth_otp_email_enabled
        and settings.gmail_sender
        and settings.google_service_account_json
    )


def gmail_invite_configured() -> bool:
    return bool(
        settings.auth_org_invite_email_enabled
        and settings.gmail_sender
        and settings.google_service_account_json
    )


def _load_service_account_info() -> dict:
    raw = (settings.google_service_account_json or "").strip()
    if not raw:
        raise GmailSendError("gmail_not_configured")
    if raw.startswith("{"):
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            raise GmailSendError("invalid_service_account_json") from exc
    path = Path(raw)
    if path.is_file():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise GmailSendError("invalid_service_account_json") from exc
    raise GmailSendError("invalid_service_account_json")


def _send_email_sync(*, to: str, subject: str, body: str) -> None:
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError as exc:
        raise GmailSendError("gmail_dependencies_missing") from exc

    sender = settings.gmail_sender
    if not sender:
        raise GmailSendError("gmail_not_configured")

    creds = service_account.Credentials.from_service_account_info(
        _load_service_account_info(),
        scopes=[GMAIL_SEND_SCOPE],
    )
    delegated = creds.with_subject(sender)
    service = build("gmail", "v1", credentials=delegated, cache_discovery=False)

    message = MIMEText(body, "plain", "utf-8")
    message["to"] = to
    message["from"] = sender
    message["subject"] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    try:
        service.users().messages().send(userId="me", body={"raw": raw}).execute()
    except Exception as exc:
        log.warning("gmail.send_failed", to=_redact_email(to), error=str(exc))
        raise GmailSendError("gmail_send_failed") from exc


def _otp_email_body(code: str) -> str:
    return (
        f"Your Aranyix verification code is {code}.\n\n"
        "This code expires in 10 minutes. If you did not request this, you can ignore this email."
    )


async def send_signup_otp_email(*, to: str, code: str) -> None:
    if not gmail_otp_configured():
        raise GmailSendError("gmail_not_configured")
    await asyncio.to_thread(
        _send_email_sync,
        to=to,
        subject="Your Aranyix verification code",
        body=_otp_email_body(code),
    )
    log.info("gmail.otp_sent", to=_redact_email(to))


async def send_org_invite_email(
    *,
    to: str,
    org_name: str,
    org_role: str,
    invite_link: str,
    full_name: str,
) -> None:
    if not gmail_invite_configured():
        raise GmailSendError("gmail_not_configured")
    role_label = org_role.replace("_", " ").title()
    body = (
        f"Hello {full_name},\n\n"
        f"You have been invited to join {org_name} on Aranyix as {role_label}.\n\n"
        f"Accept your invitation:\n{invite_link}\n\n"
        "This link expires in 14 days. If you did not expect this invite, you can ignore this email."
    )
    await asyncio.to_thread(
        _send_email_sync,
        to=to,
        subject=f"Join {org_name} on Aranyix",
        body=body,
    )
    log.info("gmail.invite_sent", to=_redact_email(to), org=org_name)


def _redact_email(email: str) -> str:
    user, _, domain = email.partition("@")
    if not domain:
        return "***"
    return f"{user[:2]}***@{domain}"
