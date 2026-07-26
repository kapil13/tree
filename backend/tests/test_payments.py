"""Tests for Razorpay payment helpers."""

from __future__ import annotations

import hashlib
import hmac
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.payments.catalog import get_scan_pack, list_scan_packs
from app.services.payments.orders import (
    mark_order_failed,
    mark_order_paid,
    process_webhook_payload,
    razorpay_event_id,
)
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


def test_razorpay_event_id_prefers_top_level_id() -> None:
    payload = {"id": "evt_abc123", "event": "payment.captured"}
    assert razorpay_event_id(payload) == "evt_abc123"


def test_razorpay_event_id_falls_back_to_event_and_payment() -> None:
    payload = {
        "event": "payment.failed",
        "payload": {"payment": {"entity": {"id": "pay_xyz"}}},
    }
    assert razorpay_event_id(payload) == "payment.failed:pay_xyz"


@pytest.mark.asyncio
async def test_process_webhook_payment_failed() -> None:
    order = MagicMock(
        id=uuid.uuid4(),
        status="created",
        razorpay_payment_id=None,
    )
    db = AsyncMock()
    db.flush = AsyncMock()

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(
            "app.services.payments.orders.get_order_by_razorpay_id",
            AsyncMock(return_value=order),
        )
        result = await process_webhook_payload(
            db,
            {
                "event": "payment.failed",
                "payload": {
                    "payment": {
                        "entity": {
                            "id": "pay_fail_1",
                            "order_id": "order_abc",
                        }
                    }
                },
            },
        )

    assert result is order
    assert order.status == "failed"
    assert order.razorpay_payment_id == "pay_fail_1"


@pytest.mark.asyncio
async def test_mark_order_failed_is_idempotent() -> None:
    order = MagicMock(status="paid", razorpay_payment_id="pay_1")
    db = AsyncMock()
    db.flush = AsyncMock()
    result = await mark_order_failed(db, order=order, razorpay_payment_id="pay_2")
    assert result is order
    assert order.status == "paid"


@pytest.mark.asyncio
async def test_mark_order_paid_skips_credit_when_already_paid(monkeypatch) -> None:
    order = MagicMock(
        id=uuid.uuid4(),
        status="paid",
        user_id=uuid.uuid4(),
        credits_granted=5,
        razorpay_payment_id="pay_1",
    )
    result = MagicMock()
    result.scalar_one_or_none = MagicMock(return_value=order)
    db = AsyncMock()
    db.execute = AsyncMock(return_value=result)
    db.flush = AsyncMock()
    credit = AsyncMock()
    monkeypatch.setattr("app.services.payments.orders.credit_scans", credit)
    out = await mark_order_paid(db, order=order, razorpay_payment_id="pay_2")
    assert out is order
    credit.assert_not_awaited()
