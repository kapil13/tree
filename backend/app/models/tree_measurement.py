from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class TreeMeasurement(UUIDPKMixin, TimestampMixin, Base):
    """Repeated field measurements for ex-post MRV and growth reconstruction."""

    __tablename__ = "tree_measurements"

    tree_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trees.id", ondelete="CASCADE"), nullable=False
    )
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    method: Mapped[str] = mapped_column(String(32), nullable=False)
    instrument: Mapped[str | None] = mapped_column(String(64))
    measurer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    dbh_cm: Mapped[float | None] = mapped_column(Numeric(6, 2))
    height_m: Mapped[float | None] = mapped_column(Numeric(6, 2))
    canopy_m: Mapped[float | None] = mapped_column(Numeric(6, 2))
    gps_accuracy_m: Mapped[float | None] = mapped_column(Numeric(8, 2))
    photo_key: Mapped[str | None] = mapped_column(String(512))
    notes: Mapped[str | None] = mapped_column(Text)
    uncertainty_dbh_pct: Mapped[float | None] = mapped_column(Numeric(5, 2))
    uncertainty_height_pct: Mapped[float | None] = mapped_column(Numeric(5, 2))

    tree = relationship("Tree", back_populates="measurements")
    measurer = relationship("User", foreign_keys=[measurer_id])

    __table_args__ = (
        Index("tree_measurements_tree_measured_idx", "tree_id", "measured_at"),
        Index("tree_measurements_measurer_idx", "measurer_id"),
    )
