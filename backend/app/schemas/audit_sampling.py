"""Schemas for Estate Watch Phase 5 field sampling."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class SamplingPlanParams(BaseModel):
    plots_per_critical: int = Field(default=3, ge=0, le=10)
    plots_per_high: int = Field(default=2, ge=0, le=10)
    plots_per_medium: int = Field(default=1, ge=0, le=10)
    plots_per_low: int = Field(default=0, ge=0, le=10)
    layout_seed: int | None = None


class SamplingPlanGenerateOut(BaseModel):
    total_plots: int
    status: str
    stratification: str


class FieldVisitCreate(BaseModel):
    trees_observed: int | None = None
    trees_alive: int | None = None
    canopy_cover_pct: float | None = Field(default=None, ge=0, le=100)
    verification_outcome: Literal["claim_supported", "claim_unsupported", "inconclusive"] = (
        "inconclusive"
    )
    notes: str | None = None
    signals: dict[str, Any] = Field(default_factory=dict)


class FieldVisitOut(BaseModel):
    id: str
    plot_id: str
    verification_outcome: str
    trees_observed: int | None = None
    trees_alive: int | None = None
    canopy_cover_pct: float | None = None
    visited_at: datetime
    notes: str | None = None
    epistemic_label: str


class SamplingPlanSummaryOut(BaseModel):
    engagement_id: str
    has_plan: bool
    plan: dict[str, Any] | None = None
    plots: list[dict[str, Any]] = Field(default_factory=list)
    visit_stats: dict[str, int] = Field(default_factory=dict)


class FieldVerificationCompleteOut(BaseModel):
    plots_visited: int
    status: str
