from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class PlantingStandard(UUIDPKMixin, TimestampMixin, Base):
    """Planting rules for a project or reusable template snapshot."""

    __tablename__ = "planting_standards"

    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE")
    )
    template_code: Mapped[str | None] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_template_snapshot: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    rules: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    project = relationship("PlantingProject", back_populates="standards")
    work_areas = relationship("PlantationFence", back_populates="planting_standard")
