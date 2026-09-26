"""Schemas for integrity ↔ Estate Watch audit bridge."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AuditIntegrityBridgeOut(BaseModel):
    engagement_id: str
    project_id: str
    tree_count: int
    audit_ready_count: int
    audit_ready_pct: float
    blocking_count: int
    blocking_trees: list[dict[str, Any]] = Field(default_factory=list)
    export_ready: bool
    export_exportable: bool
    export_sections: list[dict[str, Any]] = Field(default_factory=list)
    integrity_gate_passed: bool
    recommendations: list[str] = Field(default_factory=list)
    message: str
