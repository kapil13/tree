"""Plot-based stratified monitoring — alternative to full tree census."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin

MonitoringMode = str  # full_census | plot_based | hybrid
Stratification = str  # work_area | species | manual


class PlotMonitoringDesign(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "plot_monitoring_designs"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False
    )
    mode: Mapped[str] = mapped_column(String(32), nullable=False, default="full_census")
    stratification: Mapped[str] = mapped_column(String(32), nullable=False, default="work_area")
    plots_per_stratum: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    plot_area_m2: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=400)
    layout_seed: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    project = relationship("PlantingProject", foreign_keys=[project_id])
    strata = relationship(
        "PlotMonitoringStratum",
        back_populates="design",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("plot_monitoring_designs_project_idx", "project_id", unique=True),
    )


class PlotMonitoringStratum(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "plot_monitoring_strata"

    design_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plot_monitoring_designs.id", ondelete="CASCADE"), nullable=False
    )
    work_area_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plantation_fences.id", ondelete="SET NULL")
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    area_ha: Mapped[float | None] = mapped_column(Numeric(12, 4))
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    design = relationship("PlotMonitoringDesign", back_populates="strata")
    plots = relationship(
        "PlotMonitoringPlot",
        back_populates="stratum",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("plot_monitoring_strata_design_idx", "design_id"),)


class PlotMonitoringPlot(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "plot_monitoring_plots"

    stratum_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plot_monitoring_strata.id", ondelete="CASCADE"), nullable=False
    )
    plot_code: Mapped[str] = mapped_column(String(64), nullable=False)
    center: Mapped[Any] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="planned")
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    stratum = relationship("PlotMonitoringStratum", back_populates="plots")
    visits = relationship(
        "PlotVisit",
        back_populates="plot",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("plot_monitoring_plots_stratum_idx", "stratum_id"),
        Index("plot_monitoring_plots_code_idx", "stratum_id", "plot_code", unique=True),
        Index("plot_monitoring_plots_center_gix", "center", postgresql_using="gist"),
    )


class PlotVisit(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "plot_visits"

    plot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plot_monitoring_plots.id", ondelete="CASCADE"), nullable=False
    )
    visited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    visitor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    gps_accuracy_m: Mapped[float | None] = mapped_column(Numeric(8, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="completed")

    plot = relationship("PlotMonitoringPlot", back_populates="visits")
    observations = relationship(
        "PlotObservation",
        back_populates="visit",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("plot_visits_plot_idx", "plot_id", "visited_at"),)


class PlotObservation(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "plot_observations"

    visit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plot_visits.id", ondelete="CASCADE"), nullable=False
    )
    tree_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trees.id", ondelete="SET NULL")
    )
    tag_number: Mapped[str | None] = mapped_column(String(64))
    species_text: Mapped[str | None] = mapped_column(String(255))
    dbh_cm: Mapped[float | None] = mapped_column(Numeric(8, 2))
    height_m: Mapped[float | None] = mapped_column(Numeric(8, 2))
    alive: Mapped[bool] = mapped_column(nullable=False, default=True)
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    visit = relationship("PlotVisit", back_populates="observations")

    __table_args__ = (Index("plot_observations_visit_idx", "visit_id"),)
