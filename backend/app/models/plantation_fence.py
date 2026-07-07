from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class PlantationFence(UUIDPKMixin, TimestampMixin, Base):
    """User-drawn plantation boundary on the map (polygon geofence)."""

    __tablename__ = "plantation_fences"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL")
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    boundary: Mapped[Any] = mapped_column(
        Geography(geometry_type="POLYGON", srid=4326), nullable=False
    )
    area_ha: Mapped[float | None] = mapped_column(Numeric(12, 4))
    last_satellite_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    owner = relationship("User", foreign_keys=[owner_user_id])
    organization = relationship("Organization")
    satellite_records = relationship(
        "PlantationSatelliteRecord",
        back_populates="fence",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("plantation_fences_boundary_gix", "boundary", postgresql_using="gist"),
        Index("plantation_fences_owner_idx", "owner_user_id"),
        Index("plantation_fences_org_idx", "organization_id"),
    )
