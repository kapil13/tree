from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

MonitoringMode = Literal["full_census", "plot_based", "hybrid"]


class PlotMonitoringDesignUpsert(BaseModel):
    mode: MonitoringMode = "plot_based"
    stratification: str = "work_area"
    plots_per_stratum: int = Field(default=5, ge=1, le=50)
    plot_area_m2: float = Field(default=400.0, ge=25.0, le=10_000.0)


class PlotObservationIn(BaseModel):
    tree_id: str | None = None
    tag_number: str | None = None
    species_text: str | None = None
    dbh_cm: float | None = None
    height_m: float | None = None
    alive: bool = True


class PlotVisitCreate(BaseModel):
    observations: list[PlotObservationIn] = Field(default_factory=list)
    notes: str | None = None
    gps_accuracy_m: float | None = None


class PlotMonitoringSummaryOut(BaseModel):
    project_id: str
    has_design: bool = False
    mode: str = "full_census"
    stratification: str | None = None
    plot_area_m2: float | None = None
    plots_per_stratum: int | None = None
    total_plots: int = 0
    visited_plots: int = 0
    strata: list[dict[str, Any]] = Field(default_factory=list)
    extrapolated_biomass_kg: float | None = None
    extrapolated_carbon_kg: float | None = None
    extrapolated_co2e_kg: float | None = None
    co2e_kg_lower_90: float | None = None
    co2e_kg_upper_90: float | None = None
    uncertainty_pct: float | None = None
    disclosure: str | None = None
    design_id: str | None = None
    status: str | None = None
    layout_seed: int | None = None
    stratum_count: int | None = None
