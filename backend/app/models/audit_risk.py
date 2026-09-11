"""Estate Watch Phase 4 — risk anomalies and auditor queue."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin

AnomalyType = str
AnomalySeverity = str  # low | medium | high | critical
RiskLevel = str  # low | medium | high | critical


class AuditAnomalyEvent(UUIDPKMixin, Base):
    """Detected anomaly on an audit block — OBSERVATION / ESTIMATION only."""

    __tablename__ = "audit_anomaly_events"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    boundary_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("boundary_versions.id", ondelete="CASCADE"), nullable=False
    )
    anomaly_type: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    epistemic_label: Mapped[str] = mapped_column(String(16), nullable=False, default="OBSERVATION")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    signals: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    engagement = relationship("AuditEngagement", backref="anomaly_events")
    boundary_version = relationship("BoundaryVersion")

    __table_args__ = (
        UniqueConstraint(
            "engagement_id",
            "boundary_version_id",
            "anomaly_type",
            name="audit_anomaly_events_type_uq",
        ),
        Index("audit_anomaly_events_engagement_idx", "engagement_id"),
        Index("audit_anomaly_events_severity_idx", "severity"),
    )


class AuditRiskAssessment(UUIDPKMixin, TimestampMixin, Base):
    """Per-block risk rollup for auditor prioritisation queue."""

    __tablename__ = "audit_risk_assessments"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    boundary_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("boundary_versions.id", ondelete="CASCADE"), nullable=False
    )
    fence_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plantation_fences.id", ondelete="SET NULL")
    )
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False, default="low")
    priority_rank: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    anomaly_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    recommended_action: Mapped[str] = mapped_column(Text, nullable=False, default="")
    epistemic_label: Mapped[str] = mapped_column(String(16), nullable=False, default="ESTIMATION")
    signals: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    assessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    engagement = relationship("AuditEngagement", backref="risk_assessments")
    boundary_version = relationship("BoundaryVersion")

    __table_args__ = (
        UniqueConstraint(
            "engagement_id",
            "boundary_version_id",
            name="audit_risk_assessments_boundary_uq",
        ),
        Index("audit_risk_assessments_engagement_idx", "engagement_id"),
        Index("audit_risk_assessments_rank_idx", "engagement_id", "priority_rank"),
    )
