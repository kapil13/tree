from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin


class CitizenProfile(TimestampMixin, Base):
    """Gamification and onboarding progress for BYOT citizens."""

    __tablename__ = "citizen_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    badges: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, default=list)
    stewardship_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_stewardship_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    onboarding_steps: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, default=list)

    user = relationship("User", back_populates="citizen_profile")
