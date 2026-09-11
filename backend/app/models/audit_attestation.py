"""Estate Watch Phase 7 — auditor review and attestation."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin

AttestationVerdict = str  # approved | rejected | conditional
ReviewDisposition = str  # uphold | overturn | defer


class AuditReviewerAttestation(UUIDPKMixin, TimestampMixin, Base):
    """Independent reviewer sign-off on an exported audit engagement."""

    __tablename__ = "audit_reviewer_attestations"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    verdict: Mapped[str] = mapped_column(String(32), nullable=False, default="conditional")
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    notes: Mapped[str | None] = mapped_column(Text)
    export_bundle_sha256: Mapped[str | None] = mapped_column(String(64))
    attestation_hash: Mapped[str | None] = mapped_column(String(64))
    epistemic_label: Mapped[str] = mapped_column(String(16), nullable=False, default="ATTESTATION")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="draft")
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    engagement = relationship("AuditEngagement", backref="reviewer_attestation")

    __table_args__ = (
        UniqueConstraint("engagement_id", name="audit_reviewer_attestations_engagement_uq"),
        Index("audit_reviewer_attestations_engagement_idx", "engagement_id"),
    )


class AuditAnomalyReview(UUIDPKMixin, Base):
    """Auditor review or dispute resolution for a single anomaly."""

    __tablename__ = "audit_anomaly_reviews"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    anomaly_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("audit_anomaly_events.id", ondelete="CASCADE"),
        nullable=False,
    )
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    disposition: Mapped[str] = mapped_column(String(32), nullable=False)
    previous_status: Mapped[str] = mapped_column(String(16), nullable=False)
    new_status: Mapped[str] = mapped_column(String(16), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False, default="")
    epistemic_label: Mapped[str] = mapped_column(String(16), nullable=False, default="ATTESTATION")
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    engagement = relationship("AuditEngagement", backref="anomaly_reviews")
    anomaly = relationship("AuditAnomalyEvent")

    __table_args__ = (
        Index("audit_anomaly_reviews_engagement_idx", "engagement_id"),
        Index("audit_anomaly_reviews_anomaly_idx", "anomaly_id", "reviewed_at"),
    )
