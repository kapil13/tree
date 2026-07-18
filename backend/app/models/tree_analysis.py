from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import UUIDPKMixin


class TreeAnalysis(UUIDPKMixin, Base):
    __tablename__ = "tree_analysis"

    tree_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trees.id", ondelete="CASCADE"), nullable=False
    )
    triggered_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    model_pipeline: Mapped[str] = mapped_column(String(255), nullable=False)
    model_versions: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)

    species_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("species.id")
    )
    species_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    species_topk: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB)

    health: Mapped[str | None] = mapped_column(String(32))
    health_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    diseases_detected: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB)

    estimated_height_m: Mapped[float | None] = mapped_column(Numeric(6, 2))
    estimated_dbh_cm: Mapped[float | None] = mapped_column(Numeric(6, 2))
    estimated_canopy_m: Mapped[float | None] = mapped_column(Numeric(6, 2))
    estimated_biomass_kg: Mapped[float | None] = mapped_column(Numeric(12, 2))

    recommendations: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB)
    overall_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    raw_output: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    tree = relationship("Tree", back_populates="analyses")

    __table_args__ = (Index("tree_analysis_tree_idx", "tree_id", "created_at"),)
