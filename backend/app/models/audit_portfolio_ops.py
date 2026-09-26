"""Estate Watch Wave C — portfolio rollups, benchmarks, patterns, digests, workspace."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class AuditPortfolioCycleRollup(UUIDPKMixin, TimestampMixin, Base):
    """Per-cycle portfolio rollup for one estate engagement (P5)."""

    __tablename__ = "audit_portfolio_cycle_rollups"

    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_cycles.id", ondelete="RESTRICT"), nullable=False
    )
    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="RESTRICT"), nullable=False
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="RESTRICT"), nullable=False
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL")
    )
    engagement_status: Mapped[str] = mapped_column(String(32), nullable=False)
    cycle_status: Mapped[str] = mapped_column(String(32), nullable=False)
    cycle_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    grade_counts: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    risk_level_counts: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    open_anomaly_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    critical_anomaly_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    plots_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    plots_visited: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    plots_due: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reconciliation_aligned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reconciliation_mismatch: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reconciliation_no_field: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint("cycle_id", name="audit_portfolio_cycle_rollups_cycle_uq"),
        Index("audit_portfolio_cycle_rollups_org_idx", "organization_id", "computed_at"),
        Index("audit_portfolio_cycle_rollups_project_idx", "project_id"),
    )


class AuditBenchmarkBaseline(UUIDPKMixin, Base):
    """Cross-estate benchmark metric (P7–P9)."""

    __tablename__ = "audit_benchmark_baselines"

    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE")
    )
    metric_code: Mapped[str] = mapped_column(String(64), nullable=False)
    metric_value: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    signals: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "scope",
            "organization_id",
            "metric_code",
            name="audit_benchmark_baselines_scope_metric_uq",
        ),
        Index("audit_benchmark_baselines_org_idx", "organization_id", "metric_code"),
    )


class AuditCrossEstatePattern(UUIDPKMixin, Base):
    """Recurring anomaly pattern across estates (P7–P9)."""

    __tablename__ = "audit_cross_estate_patterns"

    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE")
    )
    pattern_type: Mapped[str] = mapped_column(String(64), nullable=False)
    anomaly_type: Mapped[str | None] = mapped_column(String(64))
    engagement_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    affected_engagement_ids: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    severity_peak: Mapped[str | None] = mapped_column(String(16))
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    signals: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "pattern_type",
            "anomaly_type",
            name="audit_cross_estate_patterns_org_type_uq",
        ),
        Index("audit_cross_estate_patterns_org_idx", "organization_id", "detected_at"),
    )


class AuditReportTemplate(Base):
    """Reusable Estate Watch report section template (P15)."""

    __tablename__ = "audit_report_templates"

    code: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False, default="1.0.0")
    sections: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default="now()"
    )


class AuditDigestSchedule(UUIDPKMixin, TimestampMixin, Base):
    """Scheduled portfolio digest for an organization (P16)."""

    __tablename__ = "audit_digest_schedules"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    template_code: Mapped[str] = mapped_column(
        String(64), ForeignKey("audit_report_templates.code", ondelete="RESTRICT"), nullable=False
    )
    cadence: Mapped[str] = mapped_column(String(16), nullable=False, default="weekly")
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "template_code",
            name="audit_digest_schedules_org_template_uq",
        ),
    )


class AuditDigestRun(UUIDPKMixin, Base):
    """Generated digest output (P16)."""

    __tablename__ = "audit_digest_runs"

    schedule_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_digest_schedules.id", ondelete="SET NULL")
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    template_code: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="generated")
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (Index("audit_digest_runs_org_idx", "organization_id", "generated_at"),)


class AuditAuditorWorkspaceView(UUIDPKMixin, TimestampMixin, Base):
    """Saved auditor workspace filter preset (P13)."""

    __tablename__ = "audit_auditor_workspace_views"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    filters: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="audit_auditor_workspace_views_user_name_uq"),
    )
