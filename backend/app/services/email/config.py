"""Email provider configuration helpers."""

from __future__ import annotations

from typing import Any

from app.core.config import settings


def resend_configured() -> bool:
    """True when Resend API credentials and sender address are available."""
    return bool(
        (settings.resend_api_key or "").strip()
        and (settings.resend_from_email or "").strip()
    )


def email_otp_configured() -> bool:
    """True when auth OTP emails can be delivered via Resend."""
    return bool(settings.auth_otp_email_enabled and resend_configured())


def invite_email_configured() -> bool:
    """True when organization invite emails can be delivered."""
    if not settings.auth_org_invite_email_enabled:
        return False
    if resend_configured():
        return True
    return bool(settings.gmail_sender and settings.google_service_account_json)


def program_access_email_configured() -> bool:
    """True when program access notification emails can be delivered."""
    if not settings.auth_program_access_email_enabled:
        return False
    if resend_configured():
        return True
    return bool(settings.gmail_sender and settings.google_service_account_json)


def email_public_config() -> dict[str, Any]:
    """Non-secret readiness flags for health/otp-config endpoints."""
    return {
        "email_provider": "resend" if resend_configured() else "none",
        "email_configured": email_otp_configured(),
        "resend_api_key": bool((settings.resend_api_key or "").strip()),
        "resend_from_email": bool((settings.resend_from_email or "").strip()),
    }
