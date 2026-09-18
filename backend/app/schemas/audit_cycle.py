"""Schemas for the Estate Watch audit kernel."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

CycleStatus = Literal[
    "draft", "analysis_ready", "risk_assessed", "sampling_planned", "field_verification",
    "export_ready", "under_review", "attested", "superseded", "cancelled",
]


class AuditCycleCreate(BaseModel):
    trigger_reason: str | None = None
    trigger_source: str | None = None
    methodology_version: str | None = None


class AuditCycleTransition(BaseModel):
    status: CycleStatus


class AuditCycleOut(BaseModel):
    id: uuid.UUID
    engagement_id: uuid.UUID
    cycle_number: int
    status: CycleStatus
    opened_at: datetime
    closed_at: datetime | None = None
    started_by_user_id: uuid.UUID | None = None
    closed_by_user_id: uuid.UUID | None = None
    parent_cycle_id: uuid.UUID | None = None
    trigger_reason: str | None = None
    trigger_source: str | None = None
    methodology_version: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AuditCycleListOut(BaseModel):
    cycles: list[AuditCycleOut] = Field(default_factory=list)


class ReauditCycleCreate(BaseModel):
    trigger_reason: str | None = None
    trigger_source: str | None = "manual"
    methodology_version: str | None = None


class AuditRunCreate(BaseModel):
    run_type: Literal[
        "gis", "satellite_baseline", "satellite_temporal", "confidence", "risk", "sampling",
        "field_reconciliation", "integrity", "export",
    ]
    methodology_version: str | None = None
    application_version: str | None = None
    algorithm_version: str | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)
    input_manifest_hash: str | None = None


class AuditRunOut(BaseModel):
    id: uuid.UUID
    cycle_id: uuid.UUID
    run_type: str
    status: str
    started_at: datetime
    completed_at: datetime | None = None
    methodology_version: str | None = None
    application_version: str | None = None
    algorithm_version: str | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)
    input_manifest_hash: str | None = None
    output_manifest_hash: str | None = None
    error_message: str | None = None
    created_by: uuid.UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
