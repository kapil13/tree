"""Pydantic schemas for central plantation schemes."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class SchemeKpiTargetsOut(BaseModel):
    survival_pct_min: float | None = None
    geo_tagged_pct_min: float | None = None
    min_trees: int | None = None


class CentralSchemeOut(BaseModel):
    code: str
    label: str
    description: str
    ministry: str
    group: Literal["central", "convergence", "corporate"]
    program_codes: list[str]
    default_segment: str
    default_compliance_mode: Literal["open", "guided", "strict"]
    default_template_code: str | None = None
    checklist_codes: list[str] = Field(default_factory=list)
    framework_profiles: list[str] = Field(default_factory=list)
    convergence_allowed: list[str] = Field(default_factory=list)
    legacy_plantation_category: str | None = None
    kpi_targets: SchemeKpiTargetsOut = Field(default_factory=SchemeKpiTargetsOut)
    metadata_sections: list[dict[str, Any]] = Field(default_factory=list)


class CentralSchemeListOut(BaseModel):
    items: list[CentralSchemeOut]
