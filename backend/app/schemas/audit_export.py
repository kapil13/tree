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
