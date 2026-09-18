"""Immutable audit periods for Estate Watch engagements."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin

AuditCycleStatus = str


class AuditCycle(UUIDPKMixin, TimestampMixin, Base):
    """A durable audit period; attested periods are never reopened or replaced."""

    __tablename__ = "audit_cycles"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="RESTRICT"), nullable=False
    )
    cycle_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    closed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    parent_cycle_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_cycles.id", ondelete="RESTRICT")
    )
    trigger_reason: Mapped[str | None] = mapped_column(Text)
    trigger_source: Mapped[str | None] = mapped_column(String(64))
    methodology_version: Mapped[str | None] = mapped_column(String(128))

    engagement = relationship("AuditEngagement", backref="audit_cycles")
    parent_cycle = relationship("AuditCycle", remote_side="AuditCycle.id", backref="reaudit_cycles")

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'analysis_ready', 'risk_assessed', 'sampling_planned', "
            "'field_verification', 'export_ready', 'under_review', 'attested', "
            "'superseded', 'cancelled')",
            name="audit_cycles_status_ck",
        ),
        UniqueConstraint("engagement_id", "cycle_number", name="audit_cycles_engagement_number_uq"),
        Index("audit_cycles_engagement_idx", "engagement_id"),
        Index("audit_cycles_engagement_status_idx", "engagement_id", "status"),
    )
