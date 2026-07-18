"""Phone OTP helpers (dev stub + normalization)."""

from __future__ import annotations

import re

DEV_OTP_CODE = "000000"


def normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if not digits:
        raise ValueError("invalid_phone")
    if len(digits) == 10:
        return f"+91{digits}"
    if digits.startswith("91") and len(digits) == 12:
        return f"+{digits}"
    if raw.strip().startswith("+") and len(digits) >= 10:
        return f"+{digits}"
    raise ValueError("invalid_phone")


def phone_placeholder_email(phone: str) -> str:
    slug = re.sub(r"\D", "", phone)
    return f"{slug}@phone.aranyix.local"


def verify_dev_otp(code: str) -> bool:
    return code.strip() == DEV_OTP_CODE
