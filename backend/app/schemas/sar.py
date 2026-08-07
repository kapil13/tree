"""SAR / NISAR API schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SarFindingOut(BaseModel):
    category: str
    name: str
    confidence: float
    severity: str
    evidence: str


class SarAnalysisOut(BaseModel):
    risk_level: str
    ground_status: str
    summary: str
    findings: list[SarFindingOut]
    wetland_probability: float
    double_bounce_index: float
    ground_moisture_index: float
    canopy_ground_mismatch: bool
    pipeline: str


class SarFusionOut(BaseModel):
    forest_integrity_score: float
    integrity_grade: str
    monitoring_mode: str
    summary: str
    optical_ndvi: float | None = None
    optical_stale: bool = False
    sar_analysis: SarAnalysisOut
    findings: list[SarFindingOut] = Field(default_factory=list)
    pipeline: str
    tree_id: str | None = None
    fence_id: str | None = None
    sar_record_id: str | None = None


class SarRecordOut(BaseModel):
    id: uuid.UUID
    provider: str
    scene_id: str
    scene_acquired_at: datetime
    l_band_hh_db: float | None = None
    s_band_hh_db: float | None = None
    double_bounce_index: float | None = None
    wetland_probability: float | None = None
    ground_moisture_index: float | None = None
    canopy_ground_mismatch: bool | None = None
    frequency_bands: list[str] = Field(default_factory=list)
    polarimetric_composite: dict[str, float] | None = None
    coherence: float | None = None
    analysis: SarAnalysisOut | None = None
    fusion: SarFusionOut | None = None


class SarScanResponse(BaseModel):
    tree_id: uuid.UUID | None = None
    fence_id: uuid.UUID | None = None
    record: SarRecordOut
    analysis: SarAnalysisOut
    fusion: SarFusionOut | None = None


class SarMonitoringSeries(BaseModel):
    tree_id: uuid.UUID | None = None
    fence_id: uuid.UUID | None = None
    latest: SarRecordOut | None = None
    points: list[SarRecordOut] = Field(default_factory=list)
    sar_configured: bool = True


class SarStatusOut(BaseModel):
    configured: bool
    provider: str
    pipeline: str
    message: str
    gee_available: bool = False  # live SAR credentials ready (GEE or Sentinel Hub)
    sar_enabled: bool = True
    sar_provider: str = "stub"
    live_data_provider: str = "sar-gee-sentinel1"
    monthly_sweep_schedule: str = "5th of month, 03:00 UTC (Celery beat)"
    worker_queue: str = "satellite"
