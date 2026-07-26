"""Platform billing admin — payment orders and AI scan wallets (read-only)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_scan_wallet import UserAiScanWallet
from app.models.payment import PaymentOrder
from app.models.user import User
from app.services.payments.razorpay_client import payments_enabled


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

    items: list[dict[str, Any]] = []
    for order, email, full_name in rows:
        items.append(
            {
                "id": order.id,
                "user_id": order.user_id,
                "user_email": email,
                "user_full_name": full_name,
                "sku": order.sku,
                "credits_granted": order.credits_granted,
                "amount_paise": order.amount_paise,
                "currency": order.currency,
                "status": order.status,
                "paid_at": order.paid_at,
                "created_at": order.created_at,
            }
        )
    return items, total
