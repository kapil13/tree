"""DPDP privacy models — consent ledger, data subject requests, grievances."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import INET, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class ConsentRecord(UUIDPKMixin, Base):
    __tablename__ = "consent_records"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    purpose: Mapped[str] = mapped_column(String(64), nullable=False)
    policy_version: Mapped[str] = mapped_column(String(32), nullable=False)
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    withdrawn_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ip: Mapped[str | None] = mapped_column(INET)
    user_agent: Mapped[str | None] = mapped_column(Text)

    user = relationship("User", backref="consent_records")

    __table_args__ = (
        Index("consent_records_user_purpose_idx", "user_id", "purpose"),
    )


class DataSubjectRequest(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "data_subject_requests"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    request_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    notes: Mapped[str | None] = mapped_column(Text)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    handler_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    user = relationship("User", foreign_keys=[user_id], backref="data_subject_requests")
    handler = relationship("User", foreign_keys=[handler_id])

    __table_args__ = (
        Index("data_subject_requests_user_idx", "user_id", "created_at"),
        Index("data_subject_requests_status_idx", "status"),
    )


class GrievanceTicket(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "grievance_tickets"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open")
    officer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    resolution: Mapped[str | None] = mapped_column(Text)

    user = relationship("User", foreign_keys=[user_id], backref="grievance_tickets")
    officer = relationship("User", foreign_keys=[officer_id])

    __table_args__ = (
        Index("grievance_tickets_user_idx", "user_id", "created_at"),
        Index("grievance_tickets_status_idx", "status"),
    )
