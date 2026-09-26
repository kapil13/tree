"""Admin-editable planting rule template overrides (CMS rule engine)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class PlantingRuleTemplateOverride(UUIDPKMixin, TimestampMixin, Base):
    """CMS-managed override for a code-defined planting standard template."""

    __tablename__ = "planting_rule_template_overrides"

    template_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    rules: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    compliance_mode: Mapped[str | None] = mapped_column(String(16))
    effective_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    publish_note: Mapped[str | None] = mapped_column(Text)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
