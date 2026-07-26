"""Phone OTP helpers (dev stub + normalization)."""

from __future__ import annotations

import re

from app.core.config import settings

DEV_OTP_CODE = "000000"


def normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if not digits:
        raise ValueError("invalid_phone")
    if digits.startswith("91") and len(digits) >= 12:
        digits = digits[-10:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if len(digits) == 10:
        if digits[0] not in "6789":
            raise ValueError("invalid_phone")
        return f"+91{digits}"
    if raw.strip().startswith("+") and len(digits) >= 10:
        return f"+{digits}"
    raise ValueError("invalid_phone")


def phone_placeholder_email(phone: str) -> str:
    slug = re.sub(r"\D", "", phone)
    return f"{slug}@phone.aranyix.local"


def verify_dev_otp(code: str) -> bool:
    """Accept universal 000000 only when explicitly allowed (dev/test)."""
    if not settings.allow_dev_otp:
        return False
    return code.strip() == DEV_OTP_CODE


def otp_dev_hint(code: str) -> str | None:
    """Return OTP for API responses only in allowed dev environments."""
    if settings.allow_dev_otp:
        return code
    return None
