"""Immutable bioacoustic analysis run — preserves history across re-analysis."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class BioacousticAnalysisRun(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "bioacoustic_analysis_runs"

    recording_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bioacoustic_recordings.id", ondelete="CASCADE"),
        nullable=False,
    )
    run_number: Mapped[int] = mapped_column(Integer, nullable=False)
    supersedes_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bioacoustic_analysis_runs.id", ondelete="SET NULL"),
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="completed")
    pipeline: Mapped[str | None] = mapped_column(String(64))
    model_version: Mapped[str | None] = mapped_column(String(128))
    config_hash: Mapped[str | None] = mapped_column(String(64))
    audio_sha256: Mapped[str | None] = mapped_column(String(64))
    methodology_version: Mapped[str | None] = mapped_column(String(64))
    species_detections: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list
    )
    metrics: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    raw_output: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    analysis_error: Mapped[str | None] = mapped_column(String(2000))
    celery_task_id: Mapped[str | None] = mapped_column(String(64))
    analyzed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    accepted_species_count: Mapped[int | None] = mapped_column()
    acoustic_signals_count: Mapped[int | None] = mapped_column()
    biodiversity_confidence_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    shannon_diversity_index: Mapped[float | None] = mapped_column(Numeric(8, 4))
    simpson_diversity_index: Mapped[float | None] = mapped_column(Numeric(8, 4))

    recording = relationship("BioacousticRecording", back_populates="analysis_runs", foreign_keys=[recording_id])
    supersedes = relationship("BioacousticAnalysisRun", remote_side="BioacousticAnalysisRun.id")

    __table_args__ = (
        UniqueConstraint("recording_id", "run_number", name="bioacoustic_run_recording_number_uq"),
        Index("bioacoustic_run_recording_idx", "recording_id", "analyzed_at"),
    )
