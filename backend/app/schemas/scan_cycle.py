"""Scan cycle and tree scan history API schemas."""

from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel, Field


class ScanCycleJobOut(BaseModel):
    job_name: str
    label: str
    cadence: str
    schedule_utc: str
    last_run: dict | None = None
    stale: bool = False


class ScanCycleOut(BaseModel):
    generated_at: str
    registry: dict = Field(default_factory=dict)
    due_within_7_days: int = 0
    scheduled_jobs: list[ScanCycleJobOut] = Field(default_factory=list)
    recent_runs: list[dict] = Field(default_factory=list)


class TreeScanHistoryRowOut(BaseModel):
    scan_date: date
    tree_id: uuid.UUID
    tree_code: str
    species_text: str | None = None
    project_id: uuid.UUID | None = None
    project_name: str | None = None
    work_area_id: uuid.UUID | None = None
    work_area_name: str | None = None
    ndvi_mean: float | None = None
    ndvi_change_vs_baseline: float | None = None
    cloud_cover_pct: float | None = None
    provider: str | None = None
    presence_confirmed: bool | None = None
    scene_ids: list[str] = Field(default_factory=list)


class TreeScanHistoryOut(BaseModel):
    project_id: uuid.UUID | None = None
    rows: list[TreeScanHistoryRowOut]
