"""Pydantic schemas for planting projects and work areas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.plantation_fence import GeoJsonPolygon


class GeoJsonLineString(BaseModel):
    type: Literal["LineString"] = "LineString"
    coordinates: list[list[float]]

    @field_validator("coordinates")
    @classmethod
    def _valid_line(cls, v: list[list[float]]) -> list[list[float]]:
        if len(v) < 2:
            raise ValueError("line needs at least two points")
        if len(v) > 500:
            raise ValueError("line has too many vertices (max 500)")
        for lng, lat in v:
            if not (-180 <= lng <= 180 and -90 <= lat <= 90):
                raise ValueError("invalid coordinates")
        return v


class StandardTemplateOut(BaseModel):
    code: str
    name: str
    segment: str
    description: str
    compliance_mode: str
    recommended_program_codes: list[str]
    rules: dict[str, Any]


class PlantingStandardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID | None
    template_code: str | None
    name: str
    is_template_snapshot: bool
    rules: dict[str, Any]
    created_at: datetime


class ProjectSummaryOut(BaseModel):
    work_area_count: int
    tree_count: int
    target_tree_count: int | None
    open_violations: int
    progress_pct: float | None


class PlantingProjectCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=255)
    description: str = Field(default="", max_length=1024)
    segment: str = Field(default="general", max_length=64)
    compliance_mode: Literal["open", "guided", "strict"] = "guided"
    program_code: str | None = Field(default=None, max_length=64)
    scheme_code: str | None = Field(default=None, max_length=64)
    standard_template_code: str | None = Field(default=None, max_length=64)
    target_tree_count: int | None = Field(default=None, ge=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class PlantingProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1024)
    status: Literal["planning", "active", "completed", "archived"] | None = None
    compliance_mode: Literal["open", "guided", "strict"] | None = None
    target_tree_count: int | None = Field(None, ge=1)
    metadata: dict[str, Any] | None = None


class PlantingProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    description: str
    segment: str
    compliance_mode: str
    status: str
    program_code: str | None
    scheme_code: str | None
    standard_template_code: str | None
    target_tree_count: int | None
    organization_id: uuid.UUID | None
    owner_user_id: uuid.UUID
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    summary: ProjectSummaryOut | None = None
    active_standard: PlantingStandardOut | None = None


class WorkAreaCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    geometry_type: Literal["polygon", "corridor"] = "polygon"
    boundary: GeoJsonPolygon | None = None
    centerline: GeoJsonLineString | None = None
    buffer_m: float | None = Field(default=None, gt=0, le=500)
    segment_code: str | None = Field(default=None, max_length=64)
    chainage_start_km: float | None = Field(default=None, ge=0)
    chainage_end_km: float | None = Field(default=None, ge=0)
    planting_standard_id: uuid.UUID | None = None


class WorkAreaUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    segment_code: str | None = Field(default=None, max_length=64)
    chainage_start_km: float | None = Field(default=None, ge=0)
    chainage_end_km: float | None = Field(default=None, ge=0)
    geometry_type: Literal["polygon", "corridor"] | None = None
    boundary: GeoJsonPolygon | None = None
    centerline: GeoJsonLineString | None = None
    buffer_m: float | None = Field(default=None, gt=0, le=500)


class WorkAreaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID | None
    name: str
    geometry_type: str
    buffer_m: float | None
    segment_code: str | None
    chainage_start_km: float | None
    chainage_end_km: float | None
    area_ha: float | None
    boundary: GeoJsonPolygon
    centerline: GeoJsonLineString | None = None
    tree_count: int = 0
    last_satellite_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ComplianceCheckRequest(BaseModel):
    work_area_id: uuid.UUID
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy_m: float | None = Field(default=None, ge=0)
    species_text: str | None = None
    photo_count: int = Field(default=0, ge=0)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ComplianceIssueOut(BaseModel):
    violation_type: str
    severity: str
    message: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class ComplianceCheckOut(BaseModel):
    passed: bool
    mode: str
    chainage_km: float | None = None
    issues: list[ComplianceIssueOut]


class SchemeMetadataUpdate(BaseModel):
    scheme_refs: dict[str, Any] = Field(default_factory=dict)
    funding_sources: list[dict[str, Any]] | None = None
    convergence: list[dict[str, Any]] | None = None


class SchemeKpiOut(BaseModel):
    scheme_code: str | None
    scheme_label: str | None = None
    ministry: str | None = None
    targets: dict[str, Any] = Field(default_factory=dict)
    metrics: dict[str, Any] = Field(default_factory=dict)
    checks: dict[str, bool] = Field(default_factory=dict)
    status: str


class InheritedStandardOut(BaseModel):
    pit_size_cm: dict[str, Any] | None = None
    pit_size_label: str | None = None
    spacing_m_min: float | None = None
    guard_type_required: bool = False
    require_pit_photo: bool = False
    chainage_enabled: bool = False
    min_photos: int | None = None
    allowed_species: list[str] | None = None
    species_native_pct_min: float | None = None


class RegistrationProgressOut(BaseModel):
    tree_count: int
    target_tree_count: int | None = None
    progress_pct: float | None = None
    work_area_count: int


class SuggestedNextOut(BaseModel):
    work_area_id: str
    work_area_name: str
    chainage_km: float
    chainage_label: str
    chainage_display: str
    latitude: float | None = None
    longitude: float | None = None


class RegistrationWorkAreaOut(BaseModel):
    id: str
    name: str
    geometry_type: str
    tree_count: int


class RegistrationContextOut(BaseModel):
    project_id: str
    program_code: str | None = None
    compliance_mode: str
    inherited_standard: InheritedStandardOut
    standard_name: str | None = None
    progress: RegistrationProgressOut
    suggested_next: SuggestedNextOut | None = None
    work_areas: list[RegistrationWorkAreaOut] = Field(default_factory=list)


class SafeguardDocumentCreate(BaseModel):
    doc_type: Literal[
        "gram_sabha_resolution",
        "fpic_minutes",
        "patta_cfr_reference",
        "stakeholder_consultation_log",
    ]
    title: str = Field(..., min_length=1, max_length=255)
    s3_key: str = Field(..., min_length=3, max_length=512)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SafeguardDocumentOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    doc_type: str
    doc_type_label: str
    title: str
    s3_key: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    uploaded_by_user_id: uuid.UUID | None = None
    created_at: datetime | None = None


class SpeciesSuggestionOut(BaseModel):
    common_name: str
    scientific_name: str | None = None
    score: int = 0
    reasons: list[str] = Field(default_factory=list)


class SpeciesSuggestionsContextOut(BaseModel):
    state_code: str | None = None
    state_name: str | None = None
    district_code: str | None = None
    district_name: str | None = None
    segment: str
    scheme_code: str | None = None
    scheme_label: str | None = None
    segment_label: str | None = None
    has_location: bool = False
    climate_zone: str | None = None
    climate_zone_label: str | None = None
    climate_zone_description: str | None = None


class ClimateZoneOut(BaseModel):
    code: str
    label: str
    description: str


class SpeciesSuggestionsOut(BaseModel):
    suggestions: list[SpeciesSuggestionOut] = Field(default_factory=list)
    binding: bool = False
    disclaimer: str
    context: SpeciesSuggestionsContextOut
