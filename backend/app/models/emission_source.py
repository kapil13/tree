"""GHG / methane emission sources tied to project work areas."""

from __future__ import annotations

import uuid
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin


class EmissionSource(UUIDPKMixin, TimestampMixin, Base):
    """Point or area emission source registered inside a work area boundary."""

    __tablename__ = "emission_sources"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False
    )
    work_area_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plantation_fences.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, default="other")
    gas_type: Mapped[str] = mapped_column(String(8), nullable=False, default="CH4")
    geometry_kind: Mapped[str] = mapped_column(String(16), nullable=False, default="point")
    location: Mapped[Any] = mapped_column(
        Geography(geometry_type="GEOMETRY", srid=4326), nullable=False
    )
    emission_rate_g_s: Mapped[float | None] = mapped_column(Numeric(14, 6))
    annual_emission_tons: Mapped[float | None] = mapped_column(Numeric(14, 4))
    release_height_m: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False, default=2.0)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL")
    )
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    project = relationship("PlantingProject", foreign_keys=[project_id])
    work_area = relationship("PlantationFence", foreign_keys=[work_area_id])

    __table_args__ = (
        Index("emission_sources_project_idx", "project_id"),
        Index("emission_sources_work_area_idx", "work_area_id"),
        Index("emission_sources_location_gix", "location", postgresql_using="gist"),
    )


class DispersionSimulation(UUIDPKMixin, TimestampMixin, Base):
    """Stored Gaussian dispersion run for audit and map replay."""

    __tablename__ = "dispersion_simulations"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False
    )
    work_area_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plantation_fences.id", ondelete="CASCADE"), nullable=False
    )
    emission_source_ids: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, default=list)
    duration_hours: Mapped[int] = mapped_column(nullable=False, default=24)
    met_provider: Mapped[str] = mapped_column(String(32), nullable=False, default="open-meteo")
    met_snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    result: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="complete")
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    project = relationship("PlantingProject", foreign_keys=[project_id])
    work_area = relationship("PlantationFence", foreign_keys=[work_area_id])

    __table_args__ = (
        Index("dispersion_simulations_project_idx", "project_id"),
        Index("dispersion_simulations_work_area_idx", "work_area_id"),
    )


class EmissionSatelliteScan(UUIDPKMixin, TimestampMixin, Base):
    """Stored TROPOMI CH₄ scan over work area + buffer ROI."""

    __tablename__ = "emission_satellite_scans"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False
    )
    work_area_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plantation_fences.id", ondelete="CASCADE"), nullable=False
    )
    gas_type: Mapped[str] = mapped_column(String(8), nullable=False, default="CH4")
    provider: Mapped[str] = mapped_column(String(32), nullable=False, default="sentinel-5p-tropomi")
    buffer_km: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False, default=25.0)
    roi_geojson: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    series: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, default=list)
    summary: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="complete")
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    project = relationship("PlantingProject", foreign_keys=[project_id])
    work_area = relationship("PlantationFence", foreign_keys=[work_area_id])

    __table_args__ = (
        Index("emission_satellite_scans_project_idx", "project_id"),
        Index("emission_satellite_scans_work_area_idx", "work_area_id"),
    )
