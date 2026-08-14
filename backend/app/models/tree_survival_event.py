"""Tree survival / mortality events for MRV and carbon decay."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import UUIDPKMixin


class TreeSurvivalEvent(UUIDPKMixin, Base):
    __tablename__ = "tree_survival_events"

    tree_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trees.id", ondelete="CASCADE"), nullable=False
    )
    event_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    cause: Mapped[str | None] = mapped_column(String(128))
    evidence_key: Mapped[str | None] = mapped_column(String(512))
    recorded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    tree = relationship("Tree", backref="survival_events")
    recorded_by = relationship("User", foreign_keys=[recorded_by_id])

    __table_args__ = (
        Index("tree_survival_events_tree_idx", "tree_id", "event_at"),
    )
