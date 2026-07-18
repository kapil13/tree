"""Satellite / NDVI health analysis types."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class NdviObservation:
    scene_acquired_at: datetime
    ndvi_mean: float
    ndvi_min: float | None = None
    ndvi_max: float | None = None
    evi_mean: float | None = None
    change_vs_baseline: float | None = None
    cloud_cover_pct: float | None = None
    provider: str = "sentinel-2"


@dataclass
class HealthFinding:
    category: str  # stress|pest|disease|water|nutrient|general
    name: str
    confidence: float
    severity: str  # low|moderate|high|critical
    evidence: str


@dataclass
class TreatmentRecommendation:
    category: str  # pest|disease|water|nutrient|monitoring|general
    action: str
    product_or_method: str
    priority: str  # info|warning|critical
    timing: str
    notes: str = ""


@dataclass
class SatelliteHealthResult:
    risk_level: str
    health_status: str
    summary: str
    ndvi_current: float
    ndvi_trend: str
    trend_slope: float
    pest_control_needed: bool
    disease_control_needed: bool
    findings: list[HealthFinding]
    treatments: list[TreatmentRecommendation]
    monitoring_plan: list[str]
    confidence: float
    data_points: int
    pipeline: str
    llm_narrative: str | None = None
    raw_signals: dict[str, Any] = field(default_factory=dict)
