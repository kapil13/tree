from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import UUIDPKMixin


class CarbonCalculation(UUIDPKMixin, Base):
    __tablename__ = "carbon_calculations"

    tree_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trees.id", ondelete="CASCADE"), nullable=False
    )
    methodology: Mapped[str] = mapped_column(String(64), nullable=False, default="IPCC_AR6")
    inputs: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)

    agb_kg: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    bgb_kg: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_biomass_kg: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    carbon_kg: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    co2e_kg: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    annual_sequestration_kg: Mapped[float | None] = mapped_column(Numeric(12, 2))
    lifetime_credits_tco2e: Mapped[float | None] = mapped_column(Numeric(12, 3))
    estimated_revenue_usd: Mapped[float | None] = mapped_column(Numeric(12, 2))
    price_assumption_usd: Mapped[float | None] = mapped_column(Numeric(8, 2))

    confidence: Mapped[float | None] = mapped_column(Numeric(5, 4))
    engine_version: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    tree = relationship("Tree", back_populates="carbon_records")

    __table_args__ = (Index("carbon_tree_idx", "tree_id", "created_at"),)
