from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class Organization(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False, default="individual")
    country_code: Mapped[str | None] = mapped_column(String(2))
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    users = relationship(
        "User", back_populates="organization", foreign_keys="User.organization_id"
    )
    owner = relationship("User", foreign_keys=[owner_user_id])
    trees = relationship("Tree", back_populates="organization")
    invites = relationship("OrganizationInvite", back_populates="organization")

    __table_args__ = (
        Index("organizations_type_idx", "type"),
        Index("organizations_owner_user_idx", "owner_user_id"),
    )
