from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class Tree(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "trees"

    public_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL")
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    species_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("species.id")
    )
    species_text: Mapped[str | None] = mapped_column(String(255))

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    planted_at: Mapped[date | None] = mapped_column(Date)
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    last_geotag_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Geography
    location: Mapped[Any] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=False
    )
    altitude_m: Mapped[float | None] = mapped_column(Numeric(8, 2))
    accuracy_m: Mapped[float | None] = mapped_column(Numeric(8, 2))
    plantation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plantation_fences.id", ondelete="SET NULL")
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="SET NULL")
    )
    program_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_programs.id", ondelete="SET NULL")
    )

    # Cached metrics
    current_height_m: Mapped[float | None] = mapped_column(Numeric(6, 2))
    current_dbh_cm: Mapped[float | None] = mapped_column(Numeric(6, 2))
    current_canopy_m: Mapped[float | None] = mapped_column(Numeric(6, 2))
    current_health: Mapped[str] = mapped_column(String(32), default="unknown")
    current_carbon_kg: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    satellite_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_satellite_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_analysis_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    owner = relationship("User", back_populates="trees", foreign_keys=[owner_user_id])
    organization = relationship("Organization", back_populates="trees")
    species = relationship("Species")
    planting_program = relationship("PlantingProgram", back_populates="trees")
    work_area = relationship("PlantationFence", foreign_keys=[plantation_id])
    project = relationship("PlantingProject", foreign_keys=[project_id])
    images = relationship(
        "TreeImage", back_populates="tree", cascade="all, delete-orphan"
    )
    analyses = relationship(
        "TreeAnalysis", back_populates="tree", cascade="all, delete-orphan"
    )
    carbon_records = relationship(
        "CarbonCalculation", back_populates="tree", cascade="all, delete-orphan"
    )
    satellite_records = relationship(
        "SatelliteRecord", back_populates="tree", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("trees_location_gix", "location", postgresql_using="gist"),
        Index("trees_owner_idx", "owner_user_id"),
        Index("trees_org_idx", "organization_id"),
        Index("trees_species_idx", "species_id"),
        Index("trees_status_idx", "status"),
        Index("trees_health_idx", "current_health"),
        Index("trees_program_idx", "program_id"),
        Index("trees_plantation_idx", "plantation_id"),
        Index("trees_project_idx", "project_id"),
    )
