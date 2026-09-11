"""Monitoring periods for temporal biodiversity comparison at a work area."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class BioacousticMonitoringPeriod(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "bioacoustic_monitoring_periods"

    fence_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plantation_fences.id", ondelete="CASCADE"),
        nullable=False,
    )
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    season_class: Mapped[str] = mapped_column(String(32), nullable=False, default="unspecified")
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)

    fence = relationship("PlantationFence")
    recordings = relationship(
        "BioacousticRecording",
        back_populates="monitoring_period",
        foreign_keys="BioacousticRecording.monitoring_period_id",
    )
