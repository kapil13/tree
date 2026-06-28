from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import UUIDPKMixin


class SatelliteRecord(UUIDPKMixin, Base):
    __tablename__ = "satellite_records"

    tree_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trees.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    scene_id: Mapped[str] = mapped_column(String(255), nullable=False)
    scene_acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    cloud_cover_pct: Mapped[float | None] = mapped_column(Numeric(5, 2))

    ndvi_mean: Mapped[float | None] = mapped_column(Numeric(6, 4))
    ndvi_max: Mapped[float | None] = mapped_column(Numeric(6, 4))
    ndvi_min: Mapped[float | None] = mapped_column(Numeric(6, 4))
    evi_mean: Mapped[float | None] = mapped_column(Numeric(6, 4))

    presence_confirmed: Mapped[bool | None] = mapped_column(Boolean)
    change_vs_baseline: Mapped[float | None] = mapped_column(Numeric(6, 4))
    thumbnail_s3_key: Mapped[str | None] = mapped_column(String(1024))
    raw_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    tree = relationship("Tree", back_populates="satellite_records")

    __table_args__ = (Index("sat_tree_time_idx", "tree_id", "scene_acquired_at"),)
