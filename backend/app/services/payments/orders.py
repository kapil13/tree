"""Payment order lifecycle — create, verify, webhook."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import PaymentEvent, PaymentOrder
from app.models.user import User
from app.services.payments.catalog import ScanPackSku, get_scan_pack
from app.services.payments.razorpay_client import (
    RazorpayError,
    create_order,
    verify_payment_signature,
)
from app.services.payments.wallet import credit_scans


class PaymentError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


async def create_payment_order(db: AsyncSession, *, user: User, sku: str) -> PaymentOrder:
    pack = get_scan_pack(sku)
    if pack is None:
        raise PaymentError("unknown_sku")

    order_id = uuid.uuid4()
    try:
        rz = await create_order(
            amount_paise=pack.amount_paise,
            currency=pack.currency,
            receipt=str(order_id),
            notes={"sku": pack.sku, "user_id": str(user.id), "credits": str(pack.credits)},
        )
    except RazorpayError as exc:
        raise PaymentError("razorpay_order_failed") from exc

    order = PaymentOrder(
        id=order_id,
        user_id=user.id,
        sku=pack.sku,
        credits_granted=pack.credits,
        amount_paise=pack.amount_paise,
        currency=pack.currency,
        razorpay_order_id=rz["id"],
        status="created",
    )
    db.add(order)
    await db.flush()
    return order


async def get_order_for_user(
    db: AsyncSession, *, user_id: uuid.UUID, order_id: uuid.UUID
) -> PaymentOrder | None:
    res = await db.execute(
        select(PaymentOrder).where(PaymentOrder.id == order_id, PaymentOrder.user_id == user_id)
    )
    return res.scalar_one_or_none()


async def get_order_by_razorpay_id(
    db: AsyncSession, razorpay_order_id: str
) -> PaymentOrder | None:
    res = await db.execute(
        select(PaymentOrder).where(PaymentOrder.razorpay_order_id == razorpay_order_id)
    )
    return res.scalar_one_or_none()


async def mark_order_paid(
    db: AsyncSession,
    *,
    order: PaymentOrder,
    razorpay_payment_id: str,
) -> PaymentOrder:
    """Atomically transition order to paid and credit wallet once.

    Uses SELECT … FOR UPDATE so concurrent /verify + webhook cannot double-credit.
    """
    res = await db.execute(
        select(PaymentOrder).where(PaymentOrder.id == order.id).with_for_update()
    )
    locked = res.scalar_one_or_none()
    if locked is None:
        raise PaymentError("order_not_found")
    if locked.status == "paid":
        return locked

    locked.status = "paid"
    locked.razorpay_payment_id = razorpay_payment_id
    locked.paid_at = datetime.now(UTC)
    await credit_scans(db, locked.user_id, locked.credits_granted)
    await db.flush()
    return locked


async def mark_order_failed(
    db: AsyncSession,
    *,
    order: PaymentOrder,
    razorpay_payment_id: str | None = None,
) -> PaymentOrder:
    if order.status in {"paid", "failed"}:
        return order
    order.status = "failed"
    if razorpay_payment_id:
        order.razorpay_payment_id = razorpay_payment_id
    await db.flush()
    return order


def razorpay_event_id(payload: dict[str, Any], *, signature: str = "") -> str:
    """Stable idempotency key for Razorpay webhook payloads."""
    top_id = payload.get("id")
    if top_id:
        return str(top_id)
    event = str(payload.get("event", ""))
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    payment_id = entity.get("id", "")
    if event and payment_id:
        return f"{event}:{payment_id}"
    if signature:
        return signature
    return f"{event or 'unknown'}:{uuid.uuid4()}"


async def verify_and_complete_payment(
    db: AsyncSession,
    *,
    user: User,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> PaymentOrder:
    if not verify_payment_signature(
        order_id=razorpay_order_id,
        payment_id=razorpay_payment_id,
        signature=razorpay_signature,
    ):
        raise PaymentError("invalid_signature")

    order = await get_order_by_razorpay_id(db, razorpay_order_id)
    if order is None or order.user_id != user.id:
        raise PaymentError("order_not_found")

    return await mark_order_paid(
        db,
        order=order,
        razorpay_payment_id=razorpay_payment_id,
    )


async def record_webhook_event(
    db: AsyncSession,
    *,
    event_id: str,
    event_type: str,
    payload: dict[str, Any],
) -> PaymentEvent | None:
    existing = await db.execute(select(PaymentEvent).where(PaymentEvent.event_id == event_id))
    if existing.scalar_one_or_none() is not None:
        return None

    event = PaymentEvent(event_id=event_id, event_type=event_type, payload=payload)
    db.add(event)
    try:
        await db.flush()
    except IntegrityError:
        # Concurrent duplicate delivery of the same Razorpay event_id.
        await db.rollback()
        return None
    return event


async def process_webhook_payload(db: AsyncSession, payload: dict[str, Any]) -> PaymentOrder | None:
    event_type = str(payload.get("event", ""))
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    if not entity:
        return None

    razorpay_order_id = entity.get("order_id")
    razorpay_payment_id = entity.get("id")
    if not razorpay_order_id:
        return None

    order = await get_order_by_razorpay_id(db, razorpay_order_id)
    if order is None:
        return None

    if event_type == "payment.captured":
        if not razorpay_payment_id:
            return None
        return await mark_order_paid(db, order=order, razorpay_payment_id=razorpay_payment_id)

    if event_type == "payment.failed":
        return await mark_order_failed(
            db,
            order=order,
            razorpay_payment_id=razorpay_payment_id,
        )

    return None


def pack_to_dict(pack: ScanPackSku) -> dict[str, Any]:
    return {
        "sku": pack.sku,
        "label": pack.label,
        "description": pack.description,
        "credits": pack.credits,
        "amount_paise": pack.amount_paise,
        "amount_inr": pack.amount_paise / 100,
        "currency": pack.currency,
    }
