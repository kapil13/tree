"""Schemas for CMS planting rule template admin."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class RuleTemplateOverrideUpdate(BaseModel):
    enabled: bool = True
    rules: dict[str, Any] = Field(default_factory=dict)


class RuleTemplateAdminOut(BaseModel):
    template_code: str
    name: str
    segment: str
    segment_label: str = ""
    description: str
    compliance_mode: str
    recommended_program_codes: list[str] = Field(default_factory=list)
    editable: bool
    has_custom_rules: bool = False
    code_defaults: dict[str, Any]
    override: dict[str, Any]
    effective_rules: dict[str, Any]
