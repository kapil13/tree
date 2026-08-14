from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

MethodologyCode = Literal["IPCC_AR6", "VERRA_VM0047", "GOLD_STANDARD_LUF"]


class CarbonEstimateRequest(BaseModel):
    species: str = Field(..., description="Scientific or common name")
    dbh_cm: float | None = Field(default=None, ge=0)
    height_m: float | None = Field(default=None, ge=0)
    age_years: float | None = Field(default=None, ge=0)
    wood_density: float | None = Field(default=None, ge=0)
    methodology: MethodologyCode = "IPCC_AR6"
    price_usd_per_credit: float = 12.0
    climate_zone: Literal["tropical", "subtropical", "temperate", "boreal"] = "tropical"
    ecological_zone: str | None = None
    verification_tier: Literal["speculative", "ai_verified", "verra_listed", "verra_issued"] = (
        "ai_verified"
    )
    measurement_method: str | None = Field(
        default=None,
        description="tape | caliper | clinometer | photogrammetry | ai_estimate | visual_estimate",
    )
    uncertainty_dbh_pct: float | None = Field(default=None, ge=0, le=100)
    uncertainty_height_pct: float | None = Field(default=None, ge=0, le=100)


class CarbonEstimateResponse(BaseModel):
    agb_kg: float
    bgb_kg: float
    total_biomass_kg: float
    carbon_kg: float
    co2e_kg: float
    co2e_kg_lower_90: float | None = None
    co2e_kg_upper_90: float | None = None
    uncertainty_pct: float | None = None
    verra_deduction_pct: float | None = None
    creditable_co2e_kg: float | None = None
    annual_sequestration_kg: float | None
    lifetime_credits_tco2e: float | None
    estimated_revenue_usd: float | None
    confidence: float = Field(
        description="Input-completeness score (0–1), not statistical confidence interval"
    )
    methodology: MethodologyCode
    engine_version: str
    notes: list[str] = []
