"""Project compliance checklist responses (Phase 5.5)."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class ProjectChecklistResponse(UUIDPKMixin, TimestampMixin, Base):
    """Saved answers for a framework eligibility checklist on a planting project."""

    __tablename__ = "project_checklist_responses"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL")
    )
    checklist_code: Mapped[str] = mapped_column(String(64), nullable=False)
    responses: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    completion_pct: Mapped[float] = mapped_column(Numeric(5, 1), nullable=False, default=0)
    score_pct: Mapped[float] = mapped_column(Numeric(5, 1), nullable=False, default=0)
    eligibility_status: Mapped[str] = mapped_column(String(32), nullable=False, default="not_started")
    last_updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    project = relationship("PlantingProject", backref="checklist_responses")

    __table_args__ = (
        UniqueConstraint("project_id", "checklist_code", name="project_checklist_code_uq"),
        Index("project_checklist_org_idx", "organization_id"),
        Index("project_checklist_status_idx", "eligibility_status"),
    )
