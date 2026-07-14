from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String
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
    location: Mapped[Any | None] = mapped_column(Geography(geometry_type="POINT", srid=4326))
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    spectrogram_s3_key: Mapped[str | None] = mapped_column(String(512))
    preprocessing: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    species_detections: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list
    )
    total_species_count: Mapped[int | None] = mapped_column()
    total_calls_detected: Mapped[int | None] = mapped_column()
    shannon_diversity_index: Mapped[float | None] = mapped_column(Numeric(8, 4))
    bioacoustic_health_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    ai_confidence_score: Mapped[float | None] = mapped_column(Numeric(5, 4))
    analysis_summary: Mapped[str | None] = mapped_column(String(2000))
    raw_output: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    analyzed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    owner = relationship("User", foreign_keys=[owner_user_id])
    organization = relationship("Organization")
    plantation_fence = relationship("PlantationFence")

    __table_args__ = (
        Index("bioacoustic_owner_idx", "owner_user_id", "recorded_at"),
        Index("bioacoustic_fence_idx", "plantation_fence_id", "recorded_at"),
    )
