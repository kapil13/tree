"""Estate Watch Phase 3 — plantation confidence map assessments."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import UUIDPKMixin

ConfidenceGrade = str  # green | amber | red | grey


class AuditConfidenceAssessment(UUIDPKMixin, Base):
    """Per-block plantation confidence — ESTIMATION epistemic label only."""

    __tablename__ = "audit_confidence_assessments"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    boundary_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("boundary_versions.id", ondelete="CASCADE"), nullable=False
    )
    fence_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plantation_fences.id", ondelete="SET NULL")
    )
    confidence_grade: Mapped[str] = mapped_column(String(16), nullable=False, default="grey")
    confidence_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    epistemic_label: Mapped[str] = mapped_column(String(16), nullable=False, default="ESTIMATION")
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    signals: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    grid_cells: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, default=list)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    engagement = relationship("AuditEngagement", backref="confidence_assessments")
    boundary_version = relationship("BoundaryVersion")
    fence = relationship("PlantationFence")

    __table_args__ = (
        UniqueConstraint(
            "engagement_id",
            "boundary_version_id",
            name="audit_confidence_assessments_boundary_uq",
        ),
        Index("audit_confidence_assessments_engagement_idx", "engagement_id"),
        Index("audit_confidence_assessments_grade_idx", "confidence_grade"),
    )
