"""Custody transfers for credit serials."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import UUIDPKMixin


class CreditTransfer(UUIDPKMixin, Base):
    __tablename__ = "credit_transfers"

    serial_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("credit_serials.id", ondelete="RESTRICT"), nullable=False
    )
    from_org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False
    )
    to_org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False
    )
    transferred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    custody_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (Index("credit_transfers_serial_idx", "serial_id"),)
