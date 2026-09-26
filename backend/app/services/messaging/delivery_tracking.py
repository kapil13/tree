"""Email/SMS delivery receipts, suppress list, and OTP success metrics."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.messaging_delivery import MessageDeliveryReceipt, SuppressedRecipient

OTP_TEMPLATE_KEYS = frozenset(
    {
        "login_email",
        "login_phone",
        "signup_email",
        "password_reset",
    }
)


async def is_suppressed(db: AsyncSession, *, channel: str, recipient: str) -> bool:
    row = (
        await db.execute(
            select(SuppressedRecipient.id).where(
                SuppressedRecipient.channel == channel,
                SuppressedRecipient.recipient == recipient.lower(),
            )
        )
    ).scalar_one_or_none()
    return row is not None


async def record_message_delivery(
    db: AsyncSession,
    *,
    channel: str,
    provider: str,
    recipient: str,
    status: str,
    message_id: str | None = None,
    template_key: str | None = None,
    error_code: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> MessageDeliveryReceipt:
    receipt = MessageDeliveryReceipt(
        channel=channel,
        provider=provider,
        recipient=recipient.lower(),
        message_id=message_id,
        template_key=template_key,
        status=status,
        error_code=error_code,
        metadata_=metadata or {},
    )
    db.add(receipt)
    await db.flush()
    return receipt


async def suppress_recipient(
    db: AsyncSession,
    *,
    channel: str,
    recipient: str,
    reason: str,
    source: str = "resend",
    provider_event_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    stmt = (
        insert(SuppressedRecipient)
        .values(
            id=uuid.uuid4(),
            channel=channel,
            recipient=recipient.lower(),
            reason=reason,
            source=source,
            provider_event_id=provider_event_id,
            metadata_=metadata or {},
        )
        .on_conflict_do_nothing(index_elements=["channel", "recipient"])
    )
    await db.execute(stmt)


async def handle_resend_event(db: AsyncSession, event: dict[str, Any]) -> None:
    event_type = str(event.get("type") or "")
    data = event.get("data") or {}
    if not isinstance(data, dict):
        return
    recipient = str(data.get("to") or data.get("email") or "").strip().lower()
    if not recipient:
        return
    if event_type == "email.bounced":
        await suppress_recipient(
            db,
            channel="email",
            recipient=recipient,
            reason="bounce",
            provider_event_id=str(event.get("id") or ""),
            metadata={"event_type": event_type, "bounce": data.get("bounce")},
        )
        await record_message_delivery(
            db,
            channel="email",
            provider="resend",
            recipient=recipient,
            status="bounced",
            message_id=str(data.get("email_id") or data.get("id") or ""),
            template_key=None,
            metadata={"event_type": event_type},
        )
    elif event_type == "email.complained":
        await suppress_recipient(
            db,
            channel="email",
            recipient=recipient,
            reason="complaint",
            provider_event_id=str(event.get("id") or ""),
            metadata={"event_type": event_type},
        )
        await record_message_delivery(
            db,
            channel="email",
            provider="resend",
            recipient=recipient,
            status="complained",
            message_id=str(data.get("email_id") or data.get("id") or ""),
            metadata={"event_type": event_type},
        )


async def build_messaging_delivery_stats(
    db: AsyncSession,
    *,
    window_hours: int = 24,
) -> dict[str, Any]:
    since = datetime.now(UTC) - timedelta(hours=window_hours)
    rows = (
        await db.execute(
            select(MessageDeliveryReceipt.channel, MessageDeliveryReceipt.status, func.count())
            .where(MessageDeliveryReceipt.created_at >= since)
            .group_by(MessageDeliveryReceipt.channel, MessageDeliveryReceipt.status)
        )
    ).all()
    by_channel: dict[str, dict[str, int]] = {}
    for channel, status, count in rows:
        by_channel.setdefault(channel, {})[status] = int(count)

    otp_sent = (
        await db.execute(
            select(func.count())
            .select_from(MessageDeliveryReceipt)
            .where(
                MessageDeliveryReceipt.created_at >= since,
                MessageDeliveryReceipt.template_key.in_(OTP_TEMPLATE_KEYS),
                MessageDeliveryReceipt.status == "sent",
            )
        )
    ).scalar_one()
    otp_verified = (
        await db.execute(
            select(func.count())
            .select_from(MessageDeliveryReceipt)
            .where(
                MessageDeliveryReceipt.created_at >= since,
                MessageDeliveryReceipt.template_key.in_(OTP_TEMPLATE_KEYS),
                MessageDeliveryReceipt.status == "verified",
            )
        )
    ).scalar_one()
    success_rate = round((otp_verified / otp_sent) * 100, 1) if otp_sent else None

    suppressed = (
        await db.execute(select(func.count()).select_from(SuppressedRecipient))
    ).scalar_one()

    return {
        "window_hours": window_hours,
        "by_channel": by_channel,
        "otp_sent": int(otp_sent),
        "otp_verified": int(otp_verified),
        "otp_success_rate_pct": success_rate,
        "suppressed_recipients": int(suppressed),
    }
