from __future__ import annotations

from pydantic import BaseModel


class KPI(BaseModel):
    total_trees: int
    total_biomass_kg: float
    total_carbon_kg: float
    total_co2e_kg: float
    annual_sequestration_kg: float
    lifetime_credits_tco2e: float
    estimated_revenue_usd: float
    pct_healthy: float
    pct_satellite_verified: float


class SeriesPoint(BaseModel):
    label: str
    value: float


class BioacousticDashboardKpi(BaseModel):
    total_recordings: int = 0
    avg_health_score: float = 0.0
    avg_shannon_index: float = 0.0
    total_species_detected: int = 0


class DashboardResponse(BaseModel):
    kpi: KPI
    carbon_growth: list[SeriesPoint]
    health_distribution: list[SeriesPoint]
    species_distribution: list[SeriesPoint]
    bioacoustic: BioacousticDashboardKpi = BioacousticDashboardKpi()
