from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import UUIDPKMixin


class SatelliteHealthAnalysis(UUIDPKMixin, Base):
    """AI / rules-based health analysis from NDVI satellite time series."""

    __tablename__ = "satellite_health_analyses"

    tree_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trees.id", ondelete="CASCADE")
    )
    fence_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plantation_fences.id", ondelete="CASCADE")
    )
    triggered_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    model_pipeline: Mapped[str] = mapped_column(String(255), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(32), nullable=False)
    health_status: Mapped[str] = mapped_column(String(64), nullable=False)
    summary: Mapped[str] = mapped_column(String(2000), nullable=False)

    ndvi_current: Mapped[float | None] = mapped_column(Numeric(6, 4))
    ndvi_trend: Mapped[str | None] = mapped_column(String(32))
    trend_slope: Mapped[float | None] = mapped_column(Numeric(8, 5))
    pest_control_needed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    disease_control_needed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    findings: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    treatments: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    monitoring_plan: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    overall_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    raw_output: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    tree = relationship("Tree", foreign_keys=[tree_id])
    fence = relationship("PlantationFence", foreign_keys=[fence_id])

    __table_args__ = (
        Index("sat_health_tree_idx", "tree_id", "created_at"),
        Index("sat_health_fence_idx", "fence_id", "created_at"),
    )
