from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class TreeRiskScore(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "tree_risk_scores"

    tree_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trees.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    gps_photo_match: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    duplicate_photo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    duplicate_coordinate: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ai_confidence_low: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    regeotag_mismatch: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    composite_risk: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False, default=0)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    tree = relationship("Tree", back_populates="risk_score")

    __table_args__ = (Index("tree_risk_scores_tree_idx", "tree_id"),)
