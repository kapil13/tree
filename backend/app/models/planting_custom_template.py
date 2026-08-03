"""CMS-created planting standard templates (full definitions, not code overrides)."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class PlantingCustomTemplate(UUIDPKMixin, TimestampMixin, Base):
    """Platform-admin-defined planting template stored in the database."""

    __tablename__ = "planting_custom_templates"

    template_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    segment: Mapped[str] = mapped_column(String(48), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    compliance_mode: Mapped[str] = mapped_column(String(16), nullable=False, default="guided")
    recommended_program_codes: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list
    )
    rules: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    clone_source_code: Mapped[str | None] = mapped_column(String(64))
    archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
