from __future__ import annotations

import pytest

from app.services.auth.otp import normalize_phone, phone_placeholder_email, verify_dev_otp


def test_normalize_indian_phone() -> None:
    assert normalize_phone("9876543210") == "+919876543210"
    assert normalize_phone("+919876543210") == "+919876543210"


def test_phone_placeholder_email() -> None:
    assert phone_placeholder_email("+919876543210").endswith("@phone.aranyix.local")


def test_dev_otp() -> None:
    assert verify_dev_otp("000000")
    assert not verify_dev_otp("123456")
