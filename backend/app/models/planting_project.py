from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class PlantingProject(UUIDPKMixin, TimestampMixin, Base):
    """Contract or scheme boundary — NHAI package, mine green belt, township phase, etc."""

    __tablename__ = "planting_projects"

    code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1024), nullable=False, default="")
    segment: Mapped[str] = mapped_column(String(64), nullable=False, default="general")
    compliance_mode: Mapped[str] = mapped_column(String(16), nullable=False, default="guided")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="planning")
    program_code: Mapped[str | None] = mapped_column(String(64))
    standard_template_code: Mapped[str | None] = mapped_column(String(64))
    target_tree_count: Mapped[int | None] = mapped_column(Integer)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL")
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    owner = relationship("User", foreign_keys=[owner_user_id])
    organization = relationship("Organization")
    work_areas = relationship(
        "PlantationFence",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    standards = relationship(
        "PlantingStandard",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    members = relationship(
        "ProjectMember",
        back_populates="project",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("planting_projects_org_code_idx", "organization_id", "code", unique=True),
        Index("planting_projects_owner_idx", "owner_user_id"),
        Index("planting_projects_segment_idx", "segment"),
    )
