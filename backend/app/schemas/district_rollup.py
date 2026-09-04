"""District rollup API schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class DistrictRollupSchemeBucket(BaseModel):
    project_count: int = 0
    registered_trees: int = 0
    on_track: int = 0
    at_risk: int = 0


class DistrictRollupRow(BaseModel):
    state_code: str = ""
    state_name: str = ""
    district_code: str = ""
    district_name: str = ""
    block_name: str | None = None
    project_count: int = 0
    target_trees: int = 0
    registered_trees: int = 0
    gap: int = 0
    achievement_pct: float | None = None
    survival_due: int = 0
    open_violations: int = 0
    scheme_on_track: int = 0
    scheme_at_risk: int = 0
    scheme_off_track: int = 0
    avg_survival_pct: float | None = None
    avg_geo_tagged_pct: float | None = None
    by_scheme: dict[str, DistrictRollupSchemeBucket] = Field(default_factory=dict)
    by_site_type: dict[str, int] = Field(default_factory=dict)


class DistrictRollupOut(BaseModel):
    report: str
    generated_at: str
    filters: dict[str, Any]
    totals: DistrictRollupRow
    by_scheme: dict[str, DistrictRollupSchemeBucket]
    items: list[DistrictRollupRow]
    total: int
