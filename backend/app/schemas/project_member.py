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
    projects: list[dict]
    recent_violations: list[dict]


class MonitoringSummaryOut(FieldOpsSummaryOut):
    stale_satellite_work_areas: int
    work_area_monitoring: list[dict]
    unread_alerts_by_kind: dict[str, int]
    recent_jobs: list[dict]
