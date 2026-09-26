"""VM0047 accounting API schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ProjectBaselineCreate(BaseModel):
    scenario: str = "business_as_usual"
    land_cover_class: str | None = None
    description: str | None = None
    baseline_emissions_tco2e: float = Field(default=0, ge=0)
    baseline_removals_tco2e: float = Field(default=0, ge=0)
    metadata: dict | None = None


class AdditionalityCreate(BaseModel):
    status: str = "draft"
    score_pct: float = Field(default=0, ge=0, le=100)
    narrative: str | None = None
    factors: dict = Field(default_factory=dict)


class LeakageCreate(BaseModel):
    leakage_type: str = "activity_shifting"
    estimated_leakage_tco2e: float = Field(default=0, ge=0)
    mitigation_tco2e: float = Field(default=0, ge=0)
    notes: str | None = None


class CarbonPoolsUpsert(BaseModel):
    deadwood_ratio: float = Field(default=0.08, ge=0, le=1)
    litter_ratio: float = Field(default=0.04, ge=0, le=1)
    soc_tco2e_per_ha: float | None = Field(default=None, ge=0)
    area_ha: float | None = Field(default=None, ge=0)
