from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class AnalysisRequest(BaseModel):
    tree_id: uuid.UUID
    mode: Literal["species", "health", "growth", "full"] = "full"
    force_refresh: bool = False


class AnalysisJob(BaseModel):
    job_id: str
    status: str = "completed"
    analysis_id: str | None = None
    synchronous: bool = True


class AnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tree_id: uuid.UUID
    model_pipeline: str
    model_versions: dict[str, Any]
    species_id: uuid.UUID | None
    species_confidence: float | None
    species_topk: list[dict[str, Any]] | None
    health: str | None
    health_confidence: float | None
    diseases_detected: list[dict[str, Any]] | None
    estimated_height_m: float | None
    estimated_dbh_cm: float | None
    estimated_canopy_m: float | None
    estimated_biomass_kg: float | None
    recommendations: list[dict[str, Any]] | None
    overall_confidence: float | None
    created_at: datetime


class AssistantQuery(BaseModel):
    prompt: str = Field(min_length=2, max_length=4000)
    tree_id: uuid.UUID | None = None


class AssistantAnswer(BaseModel):
    answer: str
    calculations: dict[str, Any] = {}
    citations: list[str] = []
