"""Schemas for Estate Watch Phase 8 portfolio ops."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AuditPortfolioProjectOut(BaseModel):
    id: str
    code: str
    name: str
    segment: str
    scheme_code: str | None = None
    engagement_id: str | None = None
    engagement_status: str
    audit_plots_due: int = 0


class AuditPortfolioSummaryOut(BaseModel):
    estate_project_count: int
    engagement_count: int
    audit_plots_due: int
    engagements_in_field: int
    engagements_export_ready: int
    engagements_attested: int
    by_status: dict[str, int] = Field(default_factory=dict)
    by_segment: dict[str, int] = Field(default_factory=dict)
    by_scheme: dict[str, int] = Field(default_factory=dict)
    projects: list[AuditPortfolioProjectOut] = Field(default_factory=list)


class AuditFieldPlotQueueItemOut(BaseModel):
    plot_id: str
    plot_code: str
    engagement_id: str
    project_id: str
    project_code: str
    project_name: str
    risk_level: str
    priority_rank: int
    status: str
    engagement_status: str
    center: dict


class AuditFieldPlotQueueOut(BaseModel):
    total_due: int
    items: list[AuditFieldPlotQueueItemOut] = Field(default_factory=list)
    scoped_project_id: str | None = None


class AuditCrossOrgProjectOut(BaseModel):
    id: str
    code: str
    name: str
    engagement_id: str | None = None
    engagement_status: str
    cycle_number: int = 1


class AuditCrossOrgRowOut(BaseModel):
    organization_id: str | None = None
    organization_name: str
    project_count: int
    engagement_count: int
    attested_count: int
    in_field_count: int
    projects: list[AuditCrossOrgProjectOut] = Field(default_factory=list)


class AuditCrossOrgSummaryOut(BaseModel):
    organization_count: int
    engagement_count: int
    attested_count: int
    in_field_count: int
    organizations: list[AuditCrossOrgRowOut] = Field(default_factory=list)
