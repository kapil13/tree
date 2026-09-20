"""Estate Watch P1 — policy evaluations and immutable verification snapshots."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class AuditPolicyEvaluation(UUIDPKMixin, TimestampMixin, Base):
    """Server-side attestation readiness evaluation for an audit cycle."""

    __tablename__ = "audit_policy_evaluations"

    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_cycles.id", ondelete="RESTRICT"), nullable=False
    )
    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="RESTRICT"), nullable=False
    )
    policy_version: Mapped[str] = mapped_column(String(32), nullable=False, default="1.0")
    result: Mapped[str] = mapped_column(String(16), nullable=False)
    blocking_items: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    warnings: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    waivers: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    evaluated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    cycle = relationship("AuditCycle", backref="policy_evaluations")

    __table_args__ = (
        Index("audit_policy_evaluations_cycle_idx", "cycle_id", "evaluated_at"),
        Index("audit_policy_evaluations_engagement_idx", "engagement_id"),
    )


class AuditVerificationSnapshot(UUIDPKMixin, TimestampMixin, Base):
    """Immutable public verification payload bound to an attested audit cycle."""

    __tablename__ = "audit_verification_snapshots"

    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_cycles.id", ondelete="RESTRICT"), nullable=False
    )
    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="RESTRICT"), nullable=False
    )
    attestation_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    export_hash: Mapped[str | None] = mapped_column(String(64))
    export_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_exports.id", ondelete="SET NULL")
    )
    content_manifest_hash: Mapped[str | None] = mapped_column(String(64))
    snapshot_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    snapshot_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    cycle = relationship("AuditCycle", backref="verification_snapshots")

    __table_args__ = (
        UniqueConstraint("cycle_id", name="audit_verification_snapshots_cycle_uq"),
        Index("audit_verification_snapshots_attestation_hash_idx", "attestation_hash"),
        Index("audit_verification_snapshots_snapshot_hash_idx", "snapshot_hash"),
        Index("audit_verification_snapshots_export_idx", "export_id"),
    )
