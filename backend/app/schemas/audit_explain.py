"""Schemas for Estate Watch explain-only narratives (Wave E / P14)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AuditExplainOut(BaseModel):
    id: str
    target_type: str
    target_id: str
    cycle_id: str | None = None
    engagement_id: str | None = None
    organization_id: str | None = None
    mode: str
    provider: str | None = None
    answer: str
    citations: list[dict] = Field(default_factory=list)
    llm_error: str | None = None
    input_manifest_hash: str
    created_at: str | None = None


class AuditReconciliationExplainIn(BaseModel):
    boundary_version_id: str | None = None
