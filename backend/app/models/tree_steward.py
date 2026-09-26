from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class TreeSteward(UUIDPKMixin, TimestampMixin, Base):
    """Citizen stewardship — adopt and care for trees (owner or adopter)."""

    __tablename__ = "tree_stewards"

    tree_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trees.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False, default="adopter")
    nickname: Mapped[str | None] = mapped_column(String(128))
    adopted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    tree = relationship("Tree", back_populates="stewards")
    user = relationship("User", back_populates="tree_stewards")

    __table_args__ = (
        UniqueConstraint("tree_id", "user_id", name="tree_stewards_tree_user_uq"),
        Index("tree_stewards_user_idx", "user_id"),
        Index("tree_stewards_tree_idx", "tree_id"),
    )
