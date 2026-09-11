"""Schemas for Estate Watch audit intake (Phase 1)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.plantation_fence import GeoJsonPolygon


class WorkingClaimData(BaseModel):
    trees_claimed: int | None = None
    area_ha_claimed: float | None = None
    planting_date: str | None = None
    density_per_ha: float | None = None
    species_mix: list[str] = Field(default_factory=list)
    block_count: int | None = None
    notes: str | None = None


class WorkingClaimUpdate(BaseModel):
    claim: WorkingClaimData


class ClaimSnapshotOut(BaseModel):
    id: uuid.UUID
    version: int
    claim_data: dict[str, Any]
    content_hash: str
    epistemic_label: str
    frozen_at: datetime

    model_config = {"from_attributes": True}


class ClaimDocumentCreate(BaseModel):
    doc_type: str
    title: str
    s3_key: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class ClaimDocumentOut(BaseModel):
    id: uuid.UUID
    doc_type: str
    title: str
    s3_key: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    uploaded_by_user_id: uuid.UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BoundaryVersionCreate(BaseModel):
    name: str
    block_type: str | None = None
    boundary: GeoJsonPolygon
    area_ha_claimed: float | None = None
    source: str = "drawn"
    link_fence_id: uuid.UUID | None = None


class BoundaryVersionOut(BaseModel):
    id: uuid.UUID
    name: str
    block_type: str | None = None
    source: str
    boundary: GeoJsonPolygon
    area_ha_claimed: float | None = None
    area_ha_measured: float | None = None
    fence_id: uuid.UUID | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}


class PlantabilityExclusionCreate(BaseModel):
    exclusion_type: str = "other"
    name: str = ""
    boundary: GeoJsonPolygon


class PlantabilityExclusionOut(BaseModel):
    id: uuid.UUID
    exclusion_type: str
    name: str
    boundary: GeoJsonPolygon
    area_ha: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}


class PlausibilityAssessmentOut(BaseModel):
    id: uuid.UUID
    boundary_version_id: uuid.UUID
    boundary_name: str | None = None
    verdict: str
    epistemic_label: str
    summary: str
    signals: dict[str, Any] = Field(default_factory=dict)
    assessed_at: datetime

    model_config = {"from_attributes": True}


class GisValidationRunOut(BaseModel):
    id: uuid.UUID
    status: str
    checks: dict[str, Any] = Field(default_factory=dict)
    issues: list[dict[str, Any]] = Field(default_factory=list)
    run_at: datetime

    model_config = {"from_attributes": True}


class IntakeGateRequirement(BaseModel):
    id: str
    label: str
    met: bool
    detail: str | None = None


class IntakeGateOut(BaseModel):
    ready: bool
    requirements: list[IntakeGateRequirement]


class AuditEngagementOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    status: str
    intake_completed_at: datetime | None = None
    working_claim: dict[str, Any] = Field(default_factory=dict)
    latest_snapshot: ClaimSnapshotOut | None = None
    boundary_count: int = 0
    document_count: int = 0
    exclusion_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AuditEngagementDetailOut(AuditEngagementOut):
    boundaries: list[BoundaryVersionOut] = Field(default_factory=list)
    documents: list[ClaimDocumentOut] = Field(default_factory=list)
    exclusions: list[PlantabilityExclusionOut] = Field(default_factory=list)
    plausibility: list[PlausibilityAssessmentOut] = Field(default_factory=list)
    claim_snapshots: list[ClaimSnapshotOut] = Field(default_factory=list)
    latest_gis_validation: GisValidationRunOut | None = None
    intake_gate: IntakeGateOut | None = None


class KmlImportResult(BaseModel):
    imported: int
    boundaries: list[BoundaryVersionOut]
