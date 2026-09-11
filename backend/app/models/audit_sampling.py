"""Estate Watch Phase 5 — risk-driven field sampling and verification."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class AuditSamplingPlan(UUIDPKMixin, TimestampMixin, Base):
    """Stratified sampling plan derived from auditor risk queue."""

    __tablename__ = "audit_sampling_plans"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    stratification: Mapped[str] = mapped_column(String(32), nullable=False, default="risk_weighted")
    plots_per_critical: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    plots_per_high: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    plots_per_medium: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    plots_per_low: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    layout_seed: Mapped[int | None] = mapped_column(Integer)
    total_plots: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    epistemic_label: Mapped[str] = mapped_column(String(16), nullable=False, default="ESTIMATION")
    planned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    engagement = relationship("AuditEngagement", backref="sampling_plan")
    plots = relationship(
        "AuditFieldPlot",
        back_populates="plan",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("engagement_id", name="audit_sampling_plans_engagement_uq"),
        Index("audit_sampling_plans_engagement_idx", "engagement_id"),
    )


class AuditFieldPlot(UUIDPKMixin, TimestampMixin, Base):
    """Sample plot placed inside an audit block boundary."""

    __tablename__ = "audit_field_plots"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("audit_sampling_plans.id", ondelete="CASCADE"),
        nullable=False,
    )
    boundary_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("boundary_versions.id", ondelete="CASCADE"), nullable=False
    )
    risk_assessment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_risk_assessments.id", ondelete="SET NULL")
    )
    plot_code: Mapped[str] = mapped_column(String(64), nullable=False)
    center: Mapped[Any] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    priority_rank: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="planned")
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    plan = relationship("AuditSamplingPlan", back_populates="plots")
    boundary_version = relationship("BoundaryVersion")
    risk_assessment = relationship("AuditRiskAssessment")
    visits = relationship(
        "AuditFieldVisit",
        back_populates="plot",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("plan_id", "plot_code", name="audit_field_plots_code_uq"),
        Index("audit_field_plots_engagement_idx", "engagement_id"),
        Index("audit_field_plots_engagement_status_idx", "engagement_id", "status"),
        Index("audit_field_plots_plan_idx", "plan_id"),
        Index("audit_field_plots_center_gix", "center", postgresql_using="gist"),
    )


class AuditFieldVisit(UUIDPKMixin, TimestampMixin, Base):
    """Field verification visit for an audit sample plot."""

    __tablename__ = "audit_field_visits"

    plot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_field_plots.id", ondelete="CASCADE"), nullable=False
    )
    visited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    visitor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    trees_observed: Mapped[int | None] = mapped_column(Integer)
    trees_alive: Mapped[int | None] = mapped_column(Integer)
    canopy_cover_pct: Mapped[float | None] = mapped_column(Numeric(5, 2))
    verification_outcome: Mapped[str] = mapped_column(
        String(32), nullable=False, default="inconclusive"
    )
    notes: Mapped[str | None] = mapped_column(Text)
    epistemic_label: Mapped[str] = mapped_column(String(16), nullable=False, default="OBSERVATION")
    signals: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    plot = relationship("AuditFieldPlot", back_populates="visits")

    __table_args__ = (Index("audit_field_visits_plot_idx", "plot_id", "visited_at"),)
