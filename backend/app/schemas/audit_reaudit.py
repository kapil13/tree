"""Schemas for Estate Watch continuous re-audit cycles."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AuditCycleOut(BaseModel):
    cycle_number: int
    attested_at: str | None = None
    attestation_hash: str | None = None
    export_bundle_sha256: str | None = None
    verdict: str | None = None
    status: str
    archived_at: str
    notes: str | None = None


class AuditCycleSummaryOut(BaseModel):
    engagement_id: str
    current_cycle: int
    status: str
    cycles: list[AuditCycleOut] = Field(default_factory=list)
    reaudit_started_at: str | None = None


class ReauditStartCreate(BaseModel):
    notes: str | None = None


class ReauditStartOut(BaseModel):
    engagement_id: str
    status: str
    current_cycle: int
    archived_cycles: int
    plots_reset: int
    message: str
