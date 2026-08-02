"""Per-project planting rule overrides (org-level fine tuning)."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class PlantingProjectRuleOverride(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "planting_project_rule_overrides"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), unique=True
    )
    rules: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    compliance_mode: Mapped[str | None] = mapped_column(String(16))
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    publish_note: Mapped[str | None] = mapped_column(Text)
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
