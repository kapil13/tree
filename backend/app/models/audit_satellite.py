"""Estate Watch Phase 2 — engagement-scoped satellite baselines and temporal timeline."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin

TemporalPhase = str  # t0 | t1 | t2 | t3 | t4 | current


class AuditSatelliteBaseline(UUIDPKMixin, TimestampMixin, Base):
    """T0 vegetation baseline anchored to frozen claim planting date."""

    __tablename__ = "audit_satellite_baselines"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    boundary_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("boundary_versions.id", ondelete="CASCADE"), nullable=False
    )
    fence_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plantation_fences.id", ondelete="SET NULL")
    )
    planting_date: Mapped[date | None] = mapped_column(Date)
    t0_scene_acquired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    t0_scene_id: Mapped[str | None] = mapped_column(String(255))
    t0_provider: Mapped[str | None] = mapped_column(String(64))
    t0_ndvi_mean: Mapped[float | None] = mapped_column(Numeric(6, 4))
    t0_evi_mean: Mapped[float | None] = mapped_column(Numeric(6, 4))
    t0_indices: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    epistemic_label: Mapped[str] = mapped_column(String(16), nullable=False, default="OBSERVATION")
    backfill_status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    engagement = relationship("AuditEngagement", backref="satellite_baselines")
    boundary_version = relationship("BoundaryVersion")
    fence = relationship("PlantationFence")

    __table_args__ = (
        UniqueConstraint(
            "engagement_id",
            "boundary_version_id",
            name="audit_satellite_baselines_boundary_uq",
        ),
        Index("audit_satellite_baselines_engagement_idx", "engagement_id"),
    )


class AuditTemporalObservation(UUIDPKMixin, Base):
    """Temporal NDVI observation (T0–T4 + current) for audit timeline."""

    __tablename__ = "audit_temporal_observations"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    boundary_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("boundary_versions.id", ondelete="CASCADE"), nullable=False
    )
    fence_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plantation_fences.id", ondelete="SET NULL")
    )
    phase: Mapped[str] = mapped_column(String(16), nullable=False)
    scene_acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scene_id: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    ndvi_mean: Mapped[float | None] = mapped_column(Numeric(6, 4))
    evi_mean: Mapped[float | None] = mapped_column(Numeric(6, 4))
    change_vs_t0: Mapped[float | None] = mapped_column(Numeric(6, 4))
    epistemic_label: Mapped[str] = mapped_column(String(16), nullable=False, default="OBSERVATION")
    indices: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    engagement = relationship("AuditEngagement", backref="temporal_observations")
    boundary_version = relationship("BoundaryVersion")

    __table_args__ = (
        UniqueConstraint(
            "engagement_id",
            "boundary_version_id",
            "phase",
            name="audit_temporal_observations_phase_uq",
        ),
        Index("audit_temporal_observations_engagement_idx", "engagement_id"),
    )
