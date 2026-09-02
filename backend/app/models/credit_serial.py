"""Registry-grade credit serial numbers."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import UUIDPKMixin

CreditSerialStatus = str  # available | retired | cancelled


class CreditSerial(UUIDPKMixin, Base):
    __tablename__ = "credit_serials"

    serial_number: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    ledger_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("credit_ledger_events.id", ondelete="RESTRICT"), nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL")
    )
    vintage_year: Mapped[int] = mapped_column(Integer, nullable=False)
    tco2e_amount: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="available")
    retired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    beneficiary: Mapped[str | None] = mapped_column(String(255))
    retirement_reason: Mapped[str | None] = mapped_column(Text)
    paris_article6: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    corresponding_adjustment_ref: Mapped[str | None] = mapped_column(String(255))
    integrity_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    __table_args__ = (
        Index("credit_serials_project_idx", "project_id"),
        Index("credit_serials_status_idx", "status"),
    )
