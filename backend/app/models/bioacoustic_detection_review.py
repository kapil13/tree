"""Expert review decisions for bioacoustic species detections."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class BioacousticDetectionReview(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "bioacoustic_detection_reviews"

    recording_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bioacoustic_recordings.id", ondelete="CASCADE"),
        nullable=False,
    )
    analysis_run_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bioacoustic_analysis_runs.id", ondelete="SET NULL"),
    )
    scientific_name: Mapped[str] = mapped_column(String(255), nullable=False)
    reviewer_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    decision: Mapped[str] = mapped_column(String(32), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    recording = relationship("BioacousticRecording", back_populates="detection_reviews")
    analysis_run = relationship("BioacousticAnalysisRun")
    reviewer = relationship("User", foreign_keys=[reviewer_user_id])

    __table_args__ = (
        UniqueConstraint(
            "recording_id",
            "scientific_name",
            "analysis_run_id",
            name="bioacoustic_detection_review_uq",
        ),
    )
