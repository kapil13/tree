"""Schemas for project team membership."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ProjectMemberCreate(BaseModel):
    user_id: uuid.UUID
    role: str = Field(pattern="^(field_supervisor|field_worker)$")
    contractor_name: str | None = None
    work_area_ids: list[uuid.UUID] | None = None


class ProjectMemberOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    contractor_name: str | None
    work_area_ids: list[uuid.UUID] | None
    assigned_at: datetime
    user_email: str | None = None
    user_name: str | None = None

    model_config = {"from_attributes": True}


class FieldOpsSummaryOut(BaseModel):
    project_count: int
    tree_count: int
    open_violations: int
    survival_due: int
    by_segment: dict[str, int]
    by_scheme: dict[str, int] = Field(default_factory=dict)
    projects: list[dict]
    recent_violations: list[dict]


class MonitoringSummaryOut(FieldOpsSummaryOut):
    stale_satellite_work_areas: int
    stale_sar_work_areas: int = 0
    sar_at_risk_work_areas: int = 0
    sar_aligned_work_areas: int = 0
    sar_divergent_work_areas: int = 0
    sar_gap_fill_work_areas: int = 0
    sar_live_providers: int = 0
    sar_stub_providers: int = 0
    sar_avg_forest_integrity: float | None = None
    work_area_monitoring: list[dict]
    unread_alerts_by_kind: dict[str, int]
    unread_sar_alerts_by_kind: dict[str, int] = Field(default_factory=dict)
    unread_hazard_alerts_by_kind: dict[str, int] = Field(default_factory=dict)
    scan_engine: dict = Field(default_factory=dict)
    open_sar_field_verifications: list[dict] = Field(default_factory=list)
    recent_jobs: list[dict]
