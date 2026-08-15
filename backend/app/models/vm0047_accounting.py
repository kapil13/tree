"""VM0047 baseline, additionality, and leakage accounting models."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import UUIDPKMixin


class ProjectBaseline(UUIDPKMixin, Base):
    __tablename__ = "project_baselines"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False
    )
    scenario: Mapped[str] = mapped_column(String(64), nullable=False, default="business_as_usual")
    land_cover_class: Mapped[str | None] = mapped_column(String(64))
    description: Mapped[str | None] = mapped_column(Text)
    baseline_emissions_tco2e: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    baseline_removals_tco2e: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    effective_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, nullable=False, default=dict)

    project = relationship("PlantingProject", backref="baselines")

    __table_args__ = (Index("project_baselines_project_idx", "project_id", "created_at"),)


class AdditionalityAssessment(UUIDPKMixin, Base):
    __tablename__ = "additionality_assessments"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    score_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    narrative: Mapped[str | None] = mapped_column(Text)
    factors: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    assessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    assessor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    project = relationship("PlantingProject", backref="additionality_assessments")
    assessor = relationship("User", foreign_keys=[assessor_id])

    __table_args__ = (Index("additionality_assessments_project_idx", "project_id", "assessed_at"),)


class LeakageAccount(UUIDPKMixin, Base):
    __tablename__ = "leakage_accounts"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False
    )
    leakage_type: Mapped[str] = mapped_column(String(64), nullable=False, default="activity_shifting")
    estimated_leakage_tco2e: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    mitigation_tco2e: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    project = relationship("PlantingProject", backref="leakage_accounts")

    __table_args__ = (Index("leakage_accounts_project_idx", "project_id", "created_at"),)


class ProjectCarbonPools(UUIDPKMixin, Base):
    __tablename__ = "project_carbon_pools"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    deadwood_ratio: Mapped[float] = mapped_column(Numeric(6, 4), nullable=False, default=0.08)
    litter_ratio: Mapped[float] = mapped_column(Numeric(6, 4), nullable=False, default=0.04)
    soc_tco2e_per_ha: Mapped[float | None] = mapped_column(Numeric(14, 4))
    area_ha: Mapped[float | None] = mapped_column(Numeric(12, 4))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    project = relationship("PlantingProject", backref="carbon_pools", uselist=False)
