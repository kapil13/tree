"""Scheme-driven bioacoustic monitoring plans per project / work area."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class BioacousticMonitoringPlan(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "bioacoustic_monitoring_plans"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("planting_projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    fence_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("plantation_fences.id", ondelete="SET NULL"),
    )
    scheme_code: Mapped[str | None] = mapped_column(String(64))
    protocol_key: Mapped[str] = mapped_column(String(64), nullable=False, default="default")
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    cadence_days: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    min_recordings_per_cycle: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    season_class: Mapped[str] = mapped_column(String(32), nullable=False, default="unspecified")
    next_due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="on_track")
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, nullable=False, default=dict)

    project = relationship("PlantingProject")
    fence = relationship("PlantationFence")
