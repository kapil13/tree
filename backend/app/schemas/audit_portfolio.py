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


class AuditPortfolioCycleRollupOut(BaseModel):
    id: str
    cycle_id: str
    engagement_id: str
    project_id: str
    organization_id: str | None = None
    engagement_status: str
    cycle_status: str
    cycle_number: int
    grade_counts: dict[str, int] = Field(default_factory=dict)
    risk_level_counts: dict[str, int] = Field(default_factory=dict)
    open_anomaly_count: int = 0
    critical_anomaly_count: int = 0
    plots_total: int = 0
    plots_visited: int = 0
    plots_due: int = 0
    reconciliation_aligned: int = 0
    reconciliation_mismatch: int = 0
    reconciliation_no_field: int = 0
    computed_at: str | None = None


class AuditPortfolioRollupsOut(BaseModel):
    organization_id: str
    engagement_count: int
    plots_due: int
    open_anomaly_count: int
    critical_anomaly_count: int
    reconciliation_mismatch: int
    rollups: list[AuditPortfolioCycleRollupOut] = Field(default_factory=list)


class AuditBenchmarkBaselineOut(BaseModel):
    id: str
    scope: str
    organization_id: str | None = None
    metric_code: str
    metric_value: float
    sample_count: int
    signals: dict = Field(default_factory=dict)
    computed_at: str | None = None


class AuditBenchmarksOut(BaseModel):
    baselines: list[AuditBenchmarkBaselineOut] = Field(default_factory=list)


class AuditCrossEstatePatternOut(BaseModel):
    id: str
    organization_id: str | None = None
    pattern_type: str
    anomaly_type: str | None = None
    engagement_count: int
    affected_engagement_ids: list[str] = Field(default_factory=list)
    severity_peak: str | None = None
    summary: str
    signals: dict = Field(default_factory=dict)
    detected_at: str | None = None


class AuditCrossEstatePatternsOut(BaseModel):
    patterns: list[AuditCrossEstatePatternOut] = Field(default_factory=list)


class AuditReportTemplateOut(BaseModel):
    code: str
    name: str
    version: str
    sections: list = Field(default_factory=list)
    status: str


class AuditDigestScheduleCreate(BaseModel):
    template_code: str
    cadence: str = "weekly"
    enabled: bool = True


class AuditDigestScheduleOut(BaseModel):
    id: str
    organization_id: str
    template_code: str
    cadence: str
    enabled: bool
    next_run_at: str | None = None
    last_run_at: str | None = None


class AuditDigestRunOut(BaseModel):
    id: str
    schedule_id: str | None = None
    organization_id: str
    template_code: str
    status: str
    payload: dict = Field(default_factory=dict)
    generated_at: str | None = None


class AuditAuditorWorkspaceOut(BaseModel):
    total_due: int
    items: list[AuditFieldPlotQueueItemOut] = Field(default_factory=list)
    filters: dict = Field(default_factory=dict)
    engagement_statuses: dict[str, str] = Field(default_factory=dict)


class AuditWorkspaceViewCreate(BaseModel):
    name: str
    filters: dict = Field(default_factory=dict)
    is_default: bool = False


class AuditWorkspaceViewOut(BaseModel):
    id: str
    name: str
    filters: dict = Field(default_factory=dict)
    is_default: bool = False
