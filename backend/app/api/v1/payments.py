"""BYOT Razorpay payments for AI scan packs."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.models.payment import PaymentOrder
from app.schemas.payments import (
    PaymentCatalogOut,
    PaymentCheckoutOut,
    PaymentOrderCreate,
    PaymentOrderOut,
    PaymentVerifyIn,
    ScanPackOut,
)
from app.services.payments.catalog import list_scan_packs
from app.services.payments.orders import (
    PaymentError,
    create_payment_order,
    get_order_for_user,
    pack_to_dict,
    process_webhook_payload,
    record_webhook_event,
    verify_and_complete_payment,
)
from app.services.payments.razorpay_client import (
    payments_enabled,
    public_key_id,
    verify_webhook_signature,
)

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/catalog", response_model=PaymentCatalogOut)
async def payment_catalog() -> PaymentCatalogOut:
    enabled = payments_enabled()
    return PaymentCatalogOut(
        items=[ScanPackOut(**pack_to_dict(p)) for p in list_scan_packs()],
        payments_enabled=enabled,
        razorpay_key_id=public_key_id() if enabled else None,
    )


@router.post("/orders", response_model=PaymentCheckoutOut, status_code=status.HTTP_201_CREATED)
async def create_checkout_order(
    payload: PaymentOrderCreate, user: CurrentUser, db: DB
) -> PaymentCheckoutOut:
    if not payments_enabled():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="payments_not_configured")
    try:
        order = await create_payment_order(db, user=user, sku=payload.sku)
        await db.commit()
        await db.refresh(order)
    except PaymentError as exc:
        code = exc.code
        status_code = (
            status.HTTP_422_UNPROCESSABLE_ENTITY
            if code in {"unknown_sku"}
            else status.HTTP_502_BAD_GATEWAY
        )
        raise HTTPException(status_code, detail=code) from exc

    pack = next(p for p in list_scan_packs() if p.sku == order.sku)
    key_id = public_key_id()
    if not key_id:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="payments_not_configured")

    return PaymentCheckoutOut(
        order=PaymentOrderOut.model_validate(order),
        razorpay_key_id=key_id,
        amount_paise=order.amount_paise,
        currency=order.currency,
        credits=order.credits_granted,
        label=pack.label,
    )


@router.post("/verify", response_model=PaymentOrderOut)
async def verify_payment(payload: PaymentVerifyIn, user: CurrentUser, db: DB) -> PaymentOrderOut:
    if not payments_enabled():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="payments_not_configured")
    try:
        order = await verify_and_complete_payment(
            db,
            user=user,
            razorpay_order_id=payload.razorpay_order_id,
            razorpay_payment_id=payload.razorpay_payment_id,
            razorpay_signature=payload.razorpay_signature,
        )
        await db.commit()
        await db.refresh(order)
    except PaymentError as exc:
        status_code = (
            status.HTTP_404_NOT_FOUND
            if exc.code == "order_not_found"
            else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        raise HTTPException(status_code, detail=exc.code) from exc
    return PaymentOrderOut.model_validate(order)


@router.get("/orders", response_model=list[PaymentOrderOut])
async def list_my_orders(user: CurrentUser, db: DB) -> list[PaymentOrderOut]:
    rows = (
        await db.execute(
            select(PaymentOrder)
            .where(PaymentOrder.user_id == user.id)
            .order_by(PaymentOrder.created_at.desc())
            .limit(50)
        )
    ).scalars().all()
    return [PaymentOrderOut.model_validate(r) for r in rows]


@router.get("/orders/{order_id}", response_model=PaymentOrderOut)
async def get_my_order(order_id: uuid.UUID, user: CurrentUser, db: DB) -> PaymentOrderOut:
    order = await get_order_for_user(db, user_id=user.id, order_id=order_id)
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="order_not_found")
    return PaymentOrderOut.model_validate(order)


@router.get("/webhook")
async def razorpay_webhook_ping() -> dict[str, str]:
    """Razorpay dashboard / browser checks may GET this URL — POST is required for real events."""
    return {
        "status": "ok",
        "message": "Razorpay webhook endpoint. Configure POST to this URL for payment.captured events.",
    }


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: DB) -> dict[str, str]:
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    if not verify_webhook_signature(body, signature):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_webhook_signature")

    import json

    payload = json.loads(body.decode("utf-8"))
    event_id = str(payload.get("event", "")) + ":" + str(
        payload.get("payload", {}).get("payment", {}).get("entity", {}).get("id", "")
    )
    if not event_id or event_id == ":":
        event_id = signature or "unknown"

    inserted = await record_webhook_event(
        db,
        event_id=event_id,
        event_type=str(payload.get("event", "unknown")),
        payload=payload,
    )
    if inserted is None:
        await db.rollback()
        return {"status": "duplicate"}

    await process_webhook_payload(db, payload)
    await db.commit()
    return {"status": "ok"}
