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
    annual_mortality_pct: float | None = Field(default=None, ge=0, le=100)
    buffer_pct: float | None = Field(default=None, ge=0, le=50)
    nprt_score: float | None = Field(default=None, ge=0, le=100)
    ex_post_verified: bool = False
    include_other_pools: bool = False
    deadwood_ratio: float = Field(default=0.08, ge=0, le=1)
    litter_ratio: float = Field(default=0.04, ge=0, le=1)
    soc_tco2e_per_ha: float | None = Field(default=None, ge=0)
    area_ha: float | None = Field(default=None, ge=0)


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
    projected_lifetime_credits_tco2e: float | None = None
    verified_co2e_kg: float | None = None
    verified_lifetime_credits_tco2e: float | None = None
    buffer_pct_applied: float | None = None
    effective_annual_mortality_pct: float | None = None
    deadwood_kg: float | None = None
    litter_kg: float | None = None
    soc_carbon_kg: float | None = None
    total_with_pools_co2e_kg: float | None = None
    annual_sequestration_kg: float | None
    lifetime_credits_tco2e: float | None
    estimated_revenue_usd: float | None
    confidence: float = Field(
        description="Input-completeness score (0–1), not statistical confidence interval"
    )
    methodology: MethodologyCode
    engine_version: str
    notes: list[str] = []
