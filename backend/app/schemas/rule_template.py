"""Schemas for CMS planting rule template admin."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class RuleTemplateOverrideUpdate(BaseModel):
    enabled: bool = True
    rules: dict[str, Any] = Field(default_factory=dict)
    compliance_mode: Literal["open", "guided", "strict"] | None = None
    effective_from: datetime | None = None
    publish_note: str | None = Field(default=None, max_length=2000)


class RuleTemplatePreviewRequest(BaseModel):
    rules: dict[str, Any] = Field(default_factory=dict)
    compliance_mode: Literal["open", "guided", "strict"] = "strict"
    latitude: float = 28.6139
    longitude: float = 77.209
    accuracy_m: float | None = 8.0
    species_text: str | None = "Neem"
    photo_count: int = 2
    metadata: dict[str, Any] = Field(default_factory=dict)


class RuleTemplateImportBundle(BaseModel):
    version: int = 2
    templates: list[dict[str, Any]]


class ProjectRuleOverrideUpdate(BaseModel):
    enabled: bool = True
    rules: dict[str, Any] = Field(default_factory=dict)
    compliance_mode: Literal["open", "guided", "strict"] | None = None
    publish_note: str | None = Field(default=None, max_length=2000)


class ChecklistOverrideUpdate(BaseModel):
    enabled: bool = True
    item_overrides: dict[str, Any] = Field(default_factory=dict)


class RuleTemplateAdminOut(BaseModel):
    template_code: str
    name: str
    segment: str
    segment_label: str = ""
    description: str
    compliance_mode: str
    code_compliance_mode: str = ""
    recommended_program_codes: list[str] = Field(default_factory=list)
    editable: bool
    has_custom_rules: bool = False
    code_defaults: dict[str, Any]
    override: dict[str, Any]
    effective_rules: dict[str, Any]
