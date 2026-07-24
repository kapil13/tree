"""Tests for Razorpay payment helpers."""

from __future__ import annotations

import hashlib
import hmac

from app.services.payments.catalog import get_scan_pack, list_scan_packs
from app.services.payments.razorpay_client import verify_payment_signature


def test_scan_pack_catalog() -> None:
    packs = list_scan_packs()
    assert len(packs) >= 2
    pack = get_scan_pack("byot_ai_5")
    assert pack is not None
    assert pack.credits == 5
    assert pack.amount_paise > 0


def test_verify_payment_signature_roundtrip(monkeypatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "razorpay_key_secret", "test_secret")
    order_id = "order_test123"
    payment_id = "pay_test456"
    signature = hmac.new(
        b"test_secret",
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    assert verify_payment_signature(
        order_id=order_id,
        payment_id=payment_id,
        signature=signature,
    )
