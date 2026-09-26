from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class PlantingComplianceViolation(UUIDPKMixin, TimestampMixin, Base):
    """Recorded compliance issue at registration or audit time."""

    __tablename__ = "planting_compliance_violations"

    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="SET NULL")
    )
    work_area_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plantation_fences.id", ondelete="SET NULL")
    )
    tree_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trees.id", ondelete="SET NULL")
    )
    violation_type: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    project = relationship("PlantingProject")
    work_area = relationship("PlantationFence")
    tree = relationship("Tree")
