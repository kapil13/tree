from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class RiskFactors(BaseModel):
    fire_risk: float | None = Field(default=None, ge=0, le=100)
    drought_risk: float | None = Field(default=None, ge=0, le=100)
    tenure_risk: float | None = Field(default=None, ge=0, le=100)
    management_risk: float | None = Field(default=None, ge=0, le=100)


class ProjectRiskAssessmentCreate(BaseModel):
    nprt_score: float = Field(..., ge=0, le=100)
    factors: RiskFactors | dict[str, Any] = Field(default_factory=dict)
    notes: str | None = Field(default=None, max_length=1024)


class ProjectRiskAssessmentOut(BaseModel):
    id: UUID
    project_id: UUID
    nprt_score: float
    buffer_pct: float
    assessed_at: datetime
    assessor_id: UUID | None
    factors: dict[str, Any]
    notes: str | None

    model_config = {"from_attributes": True}
