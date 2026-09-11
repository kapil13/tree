"""Schemas for Estate Watch Phase 5 field sampling."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

TreePresence = Literal["present", "absent", "sparse", "not_assessable"]

TREE_PRESENCE_VALUES = frozenset({"present", "absent", "sparse", "not_assessable"})


SamplingMode = Literal["risk_weighted", "area_coverage", "hybrid"]


class SamplingPlanParams(BaseModel):
    sampling_mode: SamplingMode = "risk_weighted"
    plots_per_critical: int = Field(default=3, ge=0, le=10)
    plots_per_high: int = Field(default=2, ge=0, le=10)
    plots_per_medium: int = Field(default=1, ge=0, le=10)
    plots_per_low: int = Field(default=0, ge=0, le=10)
    ha_per_plot: float = Field(default=50.0, ge=5.0, le=5000.0)
    min_plots_per_block: int = Field(default=1, ge=1, le=10)
    layout_seed: int | None = None


class SamplingPlanPreviewOut(BaseModel):
    total_plots: int
    sampling_mode: str
    blocks: list[dict[str, Any]] = Field(default_factory=list)


class SamplingPlanGenerateOut(BaseModel):
    total_plots: int
    status: str
    stratification: str


class FieldVisitCreate(BaseModel):
    tree_presence: TreePresence
    photo_keys: list[str] = Field(min_length=1, max_length=5)
    visitor_lat: float = Field(ge=-90, le=90)
    visitor_lon: float = Field(ge=-180, le=180)
    trees_observed: int | None = Field(default=None, ge=0)
    trees_alive: int | None = Field(default=None, ge=0)
    canopy_cover_pct: float | None = Field(default=None, ge=0, le=100)
    verification_outcome: Literal["claim_supported", "claim_unsupported", "inconclusive"] = (
        "inconclusive"
    )
    notes: str | None = None
    signals: dict[str, Any] = Field(default_factory=dict)

    @field_validator("photo_keys")
    @classmethod
    def _strip_photo_keys(cls, keys: list[str]) -> list[str]:
        cleaned = [k.strip() for k in keys if k and k.strip()]
        if not cleaned:
            raise ValueError("photo_required")
        return cleaned


class FieldVisitOut(BaseModel):
    id: str
    plot_id: str
    verification_outcome: str
    tree_presence: str | None = None
    trees_observed: int | None = None
    trees_alive: int | None = None
    canopy_cover_pct: float | None = None
    visitor_lat: float | None = None
    visitor_lon: float | None = None
    distance_from_plot_m: float | None = None
    inside_boundary: bool | None = None
    photo_keys: list[str] = Field(default_factory=list)
    location_warnings: list[str] = Field(default_factory=list)
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
