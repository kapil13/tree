"""Email/SMS delivery receipts and suppression list (Phase H)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class MessageDeliveryReceipt(UUIDPKMixin, TimestampMixin, Base):
    """Outbound message delivery audit trail."""

    __tablename__ = "message_delivery_receipts"

    channel: Mapped[str] = mapped_column(String(16), nullable=False)  # email | sms
    provider: Mapped[str] = mapped_column(String(32), nullable=False)  # resend | msg91
    recipient: Mapped[str] = mapped_column(String(320), nullable=False)
    message_id: Mapped[str | None] = mapped_column(String(128))
    template_key: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="sent")
    error_code: Mapped[str | None] = mapped_column(String(64))
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    __table_args__ = (
        Index("message_delivery_receipts_channel_idx", "channel", "status"),
        Index("message_delivery_receipts_recipient_idx", "recipient"),
        Index("message_delivery_receipts_message_id_idx", "message_id"),
    )


class SuppressedRecipient(UUIDPKMixin, TimestampMixin, Base):
    """Bounce/complaint suppress list."""

    __tablename__ = "suppressed_recipients"

    channel: Mapped[str] = mapped_column(String(16), nullable=False)
    recipient: Mapped[str] = mapped_column(String(320), nullable=False)
    reason: Mapped[str] = mapped_column(String(32), nullable=False)  # bounce | complaint
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="resend")
    provider_event_id: Mapped[str | None] = mapped_column(String(128))
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    __table_args__ = (
        UniqueConstraint("channel", "recipient", name="suppressed_recipients_channel_recipient_uq"),
        Index("suppressed_recipients_reason_idx", "reason"),
    )
