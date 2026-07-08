from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class HealthFindingOut(BaseModel):
    category: str
    name: str
    confidence: float
    severity: str
    evidence: str


class TreatmentOut(BaseModel):
    category: str
    action: str
    product_or_method: str
    priority: str
    timing: str
    notes: str = ""


class SatelliteHealthAnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tree_id: uuid.UUID | None
    fence_id: uuid.UUID | None
    model_pipeline: str
    risk_level: str
    health_status: str
    summary: str
    ndvi_current: float | None
    ndvi_trend: str | None
    trend_slope: float | None
    pest_control_needed: bool
    disease_control_needed: bool
    findings: list[dict[str, Any]]
    treatments: list[dict[str, Any]]
    monitoring_plan: list[str]
    overall_confidence: float | None
    created_at: datetime
