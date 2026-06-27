from __future__ import annotations

from typing import Any

from sqlalchemy import Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class Organization(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False, default="individual")
    country_code: Mapped[str | None] = mapped_column(String(2))
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    users = relationship("User", back_populates="organization")
    trees = relationship("Tree", back_populates="organization")

    __table_args__ = (Index("organizations_type_idx", "type"),)
