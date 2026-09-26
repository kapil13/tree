"""Project non-permanence risk assessments (NPRT → dynamic buffer %)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import UUIDPKMixin


class ProjectRiskAssessment(UUIDPKMixin, Base):
    __tablename__ = "project_risk_assessments"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False
    )
    nprt_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    buffer_pct: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    assessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    assessor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    factors: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    notes: Mapped[str | None] = mapped_column(String(1024))

    project = relationship("PlantingProject", backref="risk_assessments")
    assessor = relationship("User", foreign_keys=[assessor_id])

    __table_args__ = (
        Index("project_risk_assessments_project_idx", "project_id", "assessed_at"),
    )
