"""Platform module access rules (feature flags per role)."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class PlatformModuleRule(UUIDPKMixin, TimestampMixin, Base):
    """Configurable module visibility and access by role."""

    __tablename__ = "platform_module_rules"

    module_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    allowed_roles: Mapped[list[str]] = mapped_column(
        ARRAY(String(32)), nullable=False, default=list
    )
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
