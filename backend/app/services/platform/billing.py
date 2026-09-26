"""Platform billing admin — payment orders, wallets, and credit grants."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_scan_wallet import UserAiScanWallet
from app.models.payment import PaymentEvent, PaymentOrder
from app.models.user import User
from app.services.payments.razorpay_client import payments_enabled
from app.services.payments.wallet import adjust_scans, ensure_wallet


async def build_billing_summary(db: AsyncSession) -> dict[str, Any]:
    total_orders = int(
        (await db.execute(select(func.count()).select_from(PaymentOrder))).scalar_one()
    )
    paid_orders = int(
        (
            await db.execute(
                select(func.count()).select_from(PaymentOrder).where(PaymentOrder.status == "paid")
            )
        ).scalar_one()
    )
    failed_orders = int(
        (
            await db.execute(
                select(func.count())
                .select_from(PaymentOrder)
                .where(PaymentOrder.status == "failed")
            )
        ).scalar_one()
    )
    pending_orders = total_orders - paid_orders - failed_orders
    revenue_paise = int(
        (
            await db.execute(
                select(func.coalesce(func.sum(PaymentOrder.amount_paise), 0))
                .select_from(PaymentOrder)
                .where(PaymentOrder.status == "paid")
            )
        ).scalar_one()
    )
    credits_sold = int(
        (
            await db.execute(
                select(func.coalesce(func.sum(PaymentOrder.credits_granted), 0))
                .select_from(PaymentOrder)
                .where(PaymentOrder.status == "paid")
            )
        ).scalar_one()
    )
    wallets_with_balance = int(
        (
            await db.execute(
                select(func.count())
                .select_from(UserAiScanWallet)
                .where(UserAiScanWallet.purchased_scan_balance > 0)
            )
        ).scalar_one()
    )
    total_wallet_balance = int(
        (
            await db.execute(
                select(func.coalesce(func.sum(UserAiScanWallet.purchased_scan_balance), 0))
            )
        ).scalar_one()
    )
    return {
        "payments_enabled": payments_enabled(),
        "orders": {
            "total": total_orders,
            "paid": paid_orders,
            "failed": failed_orders,
            "pending": pending_orders,
        },
        "revenue_paise": revenue_paise,
        "credits_sold": credits_sold,
        "wallets": {
            "users_with_balance": wallets_with_balance,
            "total_purchased_balance": total_wallet_balance,
        },
    }


def _serialize_order(order: PaymentOrder, email: str, full_name: str) -> dict[str, Any]:
    return {
        "id": order.id,
        "user_id": order.user_id,
        "user_email": email,
        "user_full_name": full_name,
        "sku": order.sku,
        "credits_granted": order.credits_granted,
        "amount_paise": order.amount_paise,
        "currency": order.currency,
        "status": order.status,
        "razorpay_order_id": order.razorpay_order_id,
        "razorpay_payment_id": order.razorpay_payment_id,
        "paid_at": order.paid_at,
        "created_at": order.created_at,
    }


async def query_payment_orders(
    db: AsyncSession,
    *,
    status: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[dict[str, Any]], int]:
    base = (
        select(PaymentOrder, User.email, User.full_name)
        .join(User, User.id == PaymentOrder.user_id)
        .order_by(PaymentOrder.created_at.desc())
    )
    if status:
        base = base.where(PaymentOrder.status == status)

    total = int((await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one())
    page_size = min(max(page_size, 1), 100)
    page = max(page, 1)
    rows = (await db.execute(base.offset((page - 1) * page_size).limit(page_size))).all()

    items = [_serialize_order(order, email, full_name) for order, email, full_name in rows]
    return items, total


async def get_payment_order_detail(db: AsyncSession, order_id: uuid.UUID) -> dict[str, Any] | None:
    row = (
        await db.execute(
            select(PaymentOrder, User.email, User.full_name)
            .join(User, User.id == PaymentOrder.user_id)
            .where(PaymentOrder.id == order_id)
        )
    ).one_or_none()
    if row is None:
        return None
    order, email, full_name = row
    wallet = await ensure_wallet(db, order.user_id)
    events = (
        await db.execute(
            select(PaymentEvent)
            .where(PaymentEvent.event_type.ilike("%payment%"))
            .order_by(PaymentEvent.created_at.desc())
            .limit(20)
        )
    ).scalars().all()
    related_events = [
        {
            "id": str(ev.id),
            "event_type": ev.event_type,
            "event_id": ev.event_id,
            "created_at": ev.created_at,
        }
        for ev in events
        if order.razorpay_order_id in str(ev.payload)
        or (order.razorpay_payment_id and order.razorpay_payment_id in str(ev.payload))
    ]
    detail = _serialize_order(order, email, full_name)
    detail["user_wallet_balance"] = wallet.purchased_scan_balance
    detail["payment_events"] = related_events
    return detail


async def grant_user_credits(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    credits: int,
) -> dict[str, Any]:
    user = await db.get(User, user_id)
    if user is None:
        raise ValueError("user_not_found")
    wallet = await adjust_scans(db, user_id, credits)
    return {
        "user_id": user_id,
        "credits_delta": credits,
        "new_balance": wallet.purchased_scan_balance,
    }
