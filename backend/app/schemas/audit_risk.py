"""Schemas for Estate Watch Phase 4 risk & anomaly engine."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AnomalyOut(BaseModel):
    id: str
    boundary_version_id: str
    boundary_name: str | None = None
    anomaly_type: str
    severity: str
    title: str
    summary: str
    status: str
    epistemic_label: str
    signals: dict[str, Any] = Field(default_factory=dict)
    detected_at: datetime | None = None


class AnomaliesSummaryOut(BaseModel):
    engagement_id: str
    anomaly_count: int
    severity_counts: dict[str, int] = Field(default_factory=dict)
    type_counts: dict[str, int] = Field(default_factory=dict)
    anomalies: list[AnomalyOut] = Field(default_factory=list)


class QueueBlockOut(BaseModel):
    id: str
    boundary_version_id: str
    boundary_name: str | None = None
    fence_id: str | None = None
    risk_score: int
    risk_level: str
    priority_rank: int
    anomaly_count: int
    recommended_action: str
    epistemic_label: str
    assessed_at: datetime | None = None
    anomalies: list[dict[str, Any]] = Field(default_factory=list)


class AuditorQueueOut(BaseModel):
    engagement_id: str
    block_count: int
    assessed_count: int
    anomaly_count: int
    open_anomaly_count: int
    level_counts: dict[str, int] = Field(default_factory=dict)
    queue: list[QueueBlockOut] = Field(default_factory=list)


class RiskScanOut(BaseModel):
    anomalies_detected: int
    blocks_assessed: int
    alerts_created: int
    severity_counts: dict[str, int] = Field(default_factory=dict)
