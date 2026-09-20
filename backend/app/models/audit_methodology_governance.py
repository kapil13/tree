"""Engagement methodology bindings and change audit trail (Wave D)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class AuditEngagementMethodologyOverride(UUIDPKMixin, TimestampMixin, Base):
    """Per-engagement methodology version pin and threshold overrides."""

    __tablename__ = "audit_engagement_methodology_overrides"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    methodology_version: Mapped[str] = mapped_column(
        String(128),
        ForeignKey("audit_methodologies.version", ondelete="RESTRICT"),
        nullable=False,
    )
    threshold_overrides: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    __table_args__ = (
        UniqueConstraint("engagement_id", name="audit_engagement_methodology_overrides_engagement_uq"),
    )


class AuditMethodologyChangeLog(UUIDPKMixin, Base):
    """Append-only methodology version change history for an engagement."""

    __tablename__ = "audit_methodology_change_log"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    from_version: Mapped[str | None] = mapped_column(String(128))
    to_version: Mapped[str] = mapped_column(String(128), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    changed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("audit_methodology_change_log_engagement_idx", "engagement_id", "changed_at"),
    )
