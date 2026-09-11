"""Schemas for Estate Watch Phase 2 satellite monitoring."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PromoteBoundariesOut(BaseModel):
    promoted: list[dict[str, Any]]
    count: int


class AuditBaselineOut(BaseModel):
    id: uuid.UUID
    boundary_version_id: uuid.UUID
    boundary_name: str | None = None
    fence_id: uuid.UUID | None = None
    planting_date: str | None = None
    t0_scene_acquired_at: datetime | None = None
    t0_scene_id: str | None = None
    t0_provider: str | None = None
    t0_ndvi_mean: float | None = None
    t0_evi_mean: float | None = None
    backfill_status: str
    epistemic_label: str


class TemporalObservationOut(BaseModel):
    id: uuid.UUID
    phase: str
    scene_acquired_at: datetime
    scene_id: str
    provider: str
    ndvi_mean: float | None = None
    evi_mean: float | None = None
    change_vs_t0: float | None = None
    epistemic_label: str


class SatelliteTimelineBlockOut(BaseModel):
    boundary_version_id: str
    boundary_name: str | None = None
    fence_id: str | None = None
    baseline: dict[str, Any] | None = None
    timeline: list[dict[str, Any]] = Field(default_factory=list)


class SatelliteTimelineOut(BaseModel):
    engagement_id: str
    block_count: int
    t0_baselines_found: int
    audit_mode: bool = True
    blocks: list[SatelliteTimelineBlockOut]
