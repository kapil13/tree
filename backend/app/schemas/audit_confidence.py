"""Schemas for Estate Watch Phase 3 confidence map."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ConfidenceGridCellOut(BaseModel):
    row: int
    col: int
    grade: str
    label: str


class ConfidenceBlockOut(BaseModel):
    id: str
    boundary_version_id: str
    boundary_name: str | None = None
    fence_id: str | None = None
    confidence_grade: str
    confidence_score: int
    epistemic_label: str
    summary: str
    signals: dict[str, Any] = Field(default_factory=dict)
    grid_cells: list[dict[str, Any]] = Field(default_factory=list)
    computed_at: datetime | None = None


class ConfidenceMapOut(BaseModel):
    engagement_id: str
    block_count: int
    assessed_count: int
    grade_counts: dict[str, int] = Field(default_factory=dict)
    blocks: list[ConfidenceBlockOut] = Field(default_factory=list)


class ConfidenceComputeOut(BaseModel):
    computed: int
    grade_counts: dict[str, int] = Field(default_factory=dict)
