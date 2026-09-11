"""Schemas for Estate Watch Phase 6 audit export."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ExportSectionOut(BaseModel):
    id: str
    label: str
    met: bool
    detail: str | None = None


class ExportReadinessOut(BaseModel):
    engagement_id: str
    status: str
    block_count: int
    ready: bool
    exportable: bool
    sections: list[ExportSectionOut] = Field(default_factory=list)
    last_export_sha256: str | None = None
    exported_at: str | None = None
    reconciliation_aligned_count: int = 0
    reconciliation_mismatch_count: int = 0
    reconciliation_no_field_count: int = 0


class ReconciliationBlockOut(BaseModel):
    boundary_version_id: str
    boundary_name: str | None = None
    confidence_grade: str | None = None
    confidence_score: int | None = None
    field_grade: str | None = None
    field_signal: str | None = None
    visit_count: int = 0
    tree_presence_counts: dict[str, int] = Field(default_factory=dict)
    outcome_counts: dict[str, int] = Field(default_factory=dict)
    reconciliation: str
    aligned: bool | None = None


class ReconciliationOut(BaseModel):
    engagement_id: str
    block_count: int
    aligned_count: int
    mismatch_count: int
    no_field_data_count: int
    blocks: list[ReconciliationBlockOut] = Field(default_factory=list)


class ExportSummaryOut(BaseModel):
    engagement_id: str
    project_id: str
    project_code: str
    file_count: int
    bundle_sha256: str
    zip_size_bytes: int
    signed: bool
    signature_key_id: str | None = None
    status: str
