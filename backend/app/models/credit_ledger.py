"""Project-level carbon credit ledger (Phase 5.4)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin

CreditLedgerStatus = str  # estimated | verified | buffered | issued


class ProjectCreditLedger(UUIDPKMixin, TimestampMixin, Base):
    """Snapshot of credit accounting for a planting project."""

    __tablename__ = "project_credit_ledgers"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL")
    )
    methodology: Mapped[str] = mapped_column(String(64), nullable=False, default="VERRA_VM0047")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="estimated")

    tree_count: Mapped[int] = mapped_column(nullable=False, default=0)
    gross_credits_tco2e: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    buffer_pct: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False, default=0)
    buffer_withheld_tco2e: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    net_credits_tco2e: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    issued_credits_tco2e: Mapped[float | None] = mapped_column(Numeric(14, 4))
    registry_reference: Mapped[str | None] = mapped_column(String(255))

    engine_version: Mapped[str] = mapped_column(String(64), nullable=False)
    strata: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    last_computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    project = relationship("PlantingProject", backref="credit_ledger")
    events = relationship(
        "CreditLedgerEvent",
        back_populates="ledger",
        cascade="all, delete-orphan",
        order_by="CreditLedgerEvent.created_at.desc()",
    )

    __table_args__ = (
        UniqueConstraint("project_id", name="project_credit_ledgers_project_id_key"),
        Index("credit_ledger_org_idx", "organization_id"),
        Index("credit_ledger_status_idx", "status"),
    )


class CreditLedgerEvent(UUIDPKMixin, Base):
    """Immutable status transition log for a credit ledger."""

    __tablename__ = "credit_ledger_events"

    ledger_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("project_credit_ledgers.id", ondelete="CASCADE"), nullable=False
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    from_status: Mapped[str | None] = mapped_column(String(32))
    to_status: Mapped[str] = mapped_column(String(32), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    registry_reference: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    ledger = relationship("ProjectCreditLedger", back_populates="events")

    __table_args__ = (Index("credit_ledger_event_ledger_idx", "ledger_id", "created_at"),)
