from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class SpeciesPrediction:
    scientific_name: str
    common_name: str
    confidence: float


@dataclass
class SpeciesResult:
    top: SpeciesPrediction
    topk: list[SpeciesPrediction]
    model: str
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class DiseaseFinding:
    name: str
    confidence: float
    severity: str  # 'low' | 'moderate' | 'high'


@dataclass
class HealthResult:
    health_class: str  # healthy|moderate|unhealthy|disease_risk|unknown
    confidence: float
    diseases: list[DiseaseFinding]
    model: str
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class GrowthContext:
    species_scientific: str | None
    age_years: float | None
    climate_zone: str = "tropical"
    lat: float | None = None
    lon: float | None = None
    photo_count: int = 0


@dataclass
class GrowthResult:
    dbh_cm: float
    height_m: float
    canopy_m: float
    biomass_kg: float
    confidence: float
    model: str


@dataclass
class Recommendation:
    type: str  # 'water'|'nutrient'|'pest'|'general'
    text: str
    priority: str  # 'info'|'warning'|'critical'


@dataclass
class AnalysisResult:
    species: SpeciesResult
    health: HealthResult
    growth: GrowthResult
    recommendations: list[Recommendation]
    overall_confidence: float
    pipeline: str
    versions: dict[str, str]
