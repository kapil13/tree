"""Estate Watch audit intake — engagement, claim snapshot, boundaries (Phase 1)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models._mixins import TimestampMixin, UUIDPKMixin

EngagementStatus = str  # draft | intake_complete | analysis_ready
BoundarySource = str  # claim_import | audited | drawn
ExclusionType = str  # road | water | building | rock | other
PlausibilityVerdict = str  # plausible | unusual | inconsistent | cannot_assess
ClaimDocType = str  # work_order | planting_certificate | third_party_report | tenure_reference | other


class AuditEngagement(UUIDPKMixin, TimestampMixin, Base):
    """One active audit engagement per Estate Watch planting project."""

    __tablename__ = "audit_engagements"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planting_projects.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    intake_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    project = relationship("PlantingProject", backref="audit_engagement")
    claim_snapshots = relationship(
        "ClaimSnapshot",
        back_populates="engagement",
        cascade="all, delete-orphan",
        order_by="ClaimSnapshot.version.desc()",
    )
    claim_documents = relationship(
        "ClaimDocument",
        back_populates="engagement",
        cascade="all, delete-orphan",
    )
    boundary_versions = relationship(
        "BoundaryVersion",
        back_populates="engagement",
        cascade="all, delete-orphan",
    )
    plantability_exclusions = relationship(
        "PlantabilityExclusion",
        back_populates="engagement",
        cascade="all, delete-orphan",
    )
    plausibility_assessments = relationship(
        "PlausibilityAssessment",
        back_populates="engagement",
        cascade="all, delete-orphan",
    )
    gis_validation_runs = relationship(
        "GisValidationRun",
        back_populates="engagement",
        cascade="all, delete-orphan",
        order_by="GisValidationRun.run_at.desc()",
    )

    __table_args__ = (
        UniqueConstraint("project_id", name="audit_engagements_project_uq"),
        Index("audit_engagements_org_idx", "organization_id"),
        Index("audit_engagements_status_idx", "status"),
    )


class ClaimSnapshot(UUIDPKMixin, Base):
    """Immutable frozen claim register (CLAIM epistemic label only)."""

    __tablename__ = "claim_snapshots"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    claim_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    epistemic_label: Mapped[str] = mapped_column(String(16), nullable=False, default="CLAIM")
    frozen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    engagement = relationship("AuditEngagement", back_populates="claim_snapshots")

    __table_args__ = (
        UniqueConstraint("engagement_id", "version", name="claim_snapshots_engagement_version_uq"),
        Index("claim_snapshots_engagement_idx", "engagement_id"),
    )


class ClaimDocument(UUIDPKMixin, TimestampMixin, Base):
    """Supporting documents for audit intake (work orders, certificates, reports)."""

    __tablename__ = "claim_documents"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    doc_type: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    s3_key: Mapped[str] = mapped_column(String(512), nullable=False)
    doc_metadata: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )
    uploaded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    engagement = relationship("AuditEngagement", back_populates="claim_documents")

    __table_args__ = (
        Index("claim_documents_engagement_idx", "engagement_id"),
        Index("claim_documents_type_idx", "doc_type"),
    )


class BoundaryVersion(UUIDPKMixin, TimestampMixin, Base):
    """Versioned block boundary — claim import vs audited geometry."""

    __tablename__ = "boundary_versions"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    fence_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plantation_fences.id", ondelete="SET NULL")
    )
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="claim_import")
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    block_type: Mapped[str | None] = mapped_column(String(64))
    boundary: Mapped[Any] = mapped_column(
        Geography(geometry_type="POLYGON", srid=4326), nullable=False
    )
    area_ha_claimed: Mapped[float | None] = mapped_column(Numeric(12, 4))
    area_ha_measured: Mapped[float | None] = mapped_column(Numeric(12, 4))
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    engagement = relationship("AuditEngagement", back_populates="boundary_versions")
    fence = relationship("PlantationFence")

    __table_args__ = (
        Index("boundary_versions_engagement_idx", "engagement_id"),
        Index("boundary_versions_boundary_gix", "boundary", postgresql_using="gist"),
    )


class PlantabilityExclusion(UUIDPKMixin, TimestampMixin, Base):
    """Non-plantable area polygons within an engagement."""

    __tablename__ = "plantability_exclusions"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    exclusion_type: Mapped[str] = mapped_column(String(32), nullable=False, default="other")
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    boundary: Mapped[Any] = mapped_column(
        Geography(geometry_type="POLYGON", srid=4326), nullable=False
    )
    area_ha: Mapped[float | None] = mapped_column(Numeric(12, 4))
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    engagement = relationship("AuditEngagement", back_populates="plantability_exclusions")

    __table_args__ = (
        Index("plantability_exclusions_engagement_idx", "engagement_id"),
        Index("plantability_exclusions_boundary_gix", "boundary", postgresql_using="gist"),
    )


class PlausibilityAssessment(UUIDPKMixin, Base):
    """Per-block plausibility review (OBSERVATION / ESTIMATION labels)."""

    __tablename__ = "plausibility_assessments"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    boundary_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("boundary_versions.id", ondelete="CASCADE"), nullable=False
    )
    verdict: Mapped[str] = mapped_column(String(32), nullable=False, default="cannot_assess")
    epistemic_label: Mapped[str] = mapped_column(String(16), nullable=False, default="ESTIMATION")
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    signals: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    assessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    engagement = relationship("AuditEngagement", back_populates="plausibility_assessments")
    boundary_version = relationship("BoundaryVersion")

    __table_args__ = (
        UniqueConstraint(
            "engagement_id",
            "boundary_version_id",
            name="plausibility_assessments_boundary_uq",
        ),
        Index("plausibility_assessments_engagement_idx", "engagement_id"),
    )


class GisValidationRun(UUIDPKMixin, Base):
    """GIS validation run — overlap, area mismatch, geometry checks."""

    __tablename__ = "gis_validation_runs"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("audit_engagements.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pass")
    checks: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    issues: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, default=list)
    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    engagement = relationship("AuditEngagement", back_populates="gis_validation_runs")

    __table_args__ = (Index("gis_validation_runs_engagement_idx", "engagement_id"),)
