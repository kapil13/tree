from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class BioacousticRecording(UUIDPKMixin, TimestampMixin, Base):
    """Ambient wildlife audio recording for biodiversity assessment."""

    __tablename__ = "bioacoustic_recordings"

    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL")
    )
    plantation_fence_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plantation_fences.id", ondelete="SET NULL")
    )
    s3_key: Mapped[str] = mapped_column(String(512), nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recording_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    recording_ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    location: Mapped[Any | None] = mapped_column(Geography(geometry_type="POINT", srid=4326))
    gps_accuracy_m: Mapped[float | None] = mapped_column(Numeric(8, 2))
    gps_source: Mapped[str | None] = mapped_column(String(32))
    gps_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    gps_fallback: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    latest_analysis_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bioacoustic_analysis_runs.id", ondelete="SET NULL", use_alter=True),
    )
    monitoring_period_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bioacoustic_monitoring_periods.id", ondelete="SET NULL"),
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    spectrogram_s3_key: Mapped[str | None] = mapped_column(String(512))
    preprocessing: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    species_detections: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list
    )
    total_species_count: Mapped[int | None] = mapped_column()
    accepted_species_count: Mapped[int | None] = mapped_column()
    acoustic_signals_count: Mapped[int | None] = mapped_column()
    total_calls_detected: Mapped[int | None] = mapped_column()
    shannon_diversity_index: Mapped[float | None] = mapped_column(Numeric(8, 4))
    biodiversity_confidence_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    bioacoustic_health_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    ai_confidence_score: Mapped[float | None] = mapped_column(Numeric(5, 4))
    simpson_diversity_index: Mapped[float | None] = mapped_column(Numeric(8, 4))
    analysis_error: Mapped[str | None] = mapped_column(String(2000))
    celery_task_id: Mapped[str | None] = mapped_column(String(64))
    analysis_summary: Mapped[str | None] = mapped_column(String(2000))
    raw_output: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    analyzed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    owner = relationship("User", foreign_keys=[owner_user_id])
    organization = relationship("Organization")
    plantation_fence = relationship("PlantationFence")
    analysis_runs = relationship(
        "BioacousticAnalysisRun",
        back_populates="recording",
        foreign_keys="BioacousticAnalysisRun.recording_id",
        order_by="BioacousticAnalysisRun.run_number",
    )
    latest_analysis_run = relationship(
        "BioacousticAnalysisRun",
        foreign_keys=[latest_analysis_run_id],
        uselist=False,
    )
    monitoring_period = relationship(
        "BioacousticMonitoringPeriod",
        back_populates="recordings",
        foreign_keys=[monitoring_period_id],
    )
    detection_reviews = relationship(
        "BioacousticDetectionReview",
        back_populates="recording",
        foreign_keys="BioacousticDetectionReview.recording_id",
    )

    __table_args__ = (
        Index("bioacoustic_owner_idx", "owner_user_id", "recorded_at"),
        Index("bioacoustic_fence_idx", "plantation_fence_id", "recorded_at"),
    )
