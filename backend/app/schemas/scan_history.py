"""Unified satellite scan history schemas."""

from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel, Field


class ScanHistoryRowOut(BaseModel):
    scan_date: date
    fence_id: uuid.UUID
    fence_name: str
    ndvi_mean: float | None = None
    ndvi_change_vs_baseline: float | None = None
    cloud_cover_pct: float | None = None
    ndvi_provider: str | None = None
    sar_provider: str | None = None
    forest_integrity_score: float | None = None
    integrity_grade: str | None = None
    sar_monitoring_mode: str | None = None
    sar_ground_status: str | None = None
    sar_risk_level: str | None = None
    scene_ids: list[str] = Field(default_factory=list)


class ScanHistoryOut(BaseModel):
    project_id: uuid.UUID | None = None
    fence_id: uuid.UUID | None = None
    rows: list[ScanHistoryRowOut]
