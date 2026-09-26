"""BRSR export and wizard schemas."""

from __future__ import annotations

import uuid
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.services.reports.brsr_profile import AssuranceLevel, BrsrManualKpi, BrsrOrgProfileUpdate


class BrsrExportRequest(BaseModel):
    project_id: uuid.UUID | None = None
    reporting_year: int | None = Field(default=None, ge=2000, le=2100)
    format: Literal["json", "xlsx", "zip"] = Field(
        default="zip",
        description="json | xlsx | zip (JSON + Excel assurance pack)",
    )


class BrsrProfileOut(BaseModel):
    reporting_year: int | None = None
    listed_entity: bool = False
    cin: str | None = None
    stock_exchange: str | None = None
    assurance_level: AssuranceLevel = "none"
    boundary_notes: str | None = None
    manual_kpis: dict[str, BrsrManualKpi] = Field(default_factory=dict)
    wizard_completed_steps: list[str] = Field(default_factory=list)
    disclosure_complete: bool = False


class BrsrReadinessKpiOut(BaseModel):
    kpi_id: str
    name: str
    data_available: bool
    value_summary: str | None = None
    platform_source: str | None = None
    notes: str | None = None
    action: str


class BrsrReadinessOut(BaseModel):
    readiness_pct: int
    kpi_available_count: int
    kpi_total: int
    disclosure_complete: bool
    kpis: list[BrsrReadinessKpiOut]
    value_chain: dict[str, Any]
    blockers: list[str]
    export_ready: bool


class BrsrWizardStateOut(BaseModel):
    profile: BrsrProfileOut
    scope: str
    project_id: str | None = None
    reporting_year: int
    readiness: BrsrReadinessOut
    preview: dict[str, Any]


class BrsrProfilePatchIn(BrsrOrgProfileUpdate):
    pass
