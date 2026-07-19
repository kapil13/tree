from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class PlantingProgram(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "planting_programs"

    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1024), nullable=False, default="")
    audience: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    min_photos: Mapped[int] = mapped_column(nullable=False, default=0)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    form_schema: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    memberships = relationship("UserPlantingProgram", back_populates="program")
    trees = relationship("Tree", back_populates="planting_program")


class UserPlantingProgram(UUIDPKMixin, Base):
    __tablename__ = "user_planting_programs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    program_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("planting_programs.id", ondelete="CASCADE"),
        nullable=False,
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    user = relationship("User", back_populates="planting_programs")
    program = relationship("PlantingProgram", back_populates="memberships")

    __table_args__ = (
        UniqueConstraint("user_id", "program_id", name="user_planting_programs_user_program_uq"),
        Index("user_planting_programs_user_idx", "user_id"),
        Index("user_planting_programs_program_idx", "program_id"),
    )
