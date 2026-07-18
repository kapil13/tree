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
