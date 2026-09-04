"""Typed definitions for central plantation schemes."""

from __future__ import annotations

from typing import Any, Literal, TypedDict

SchemeGroup = Literal["central", "convergence", "corporate", "cooperative", "state"]


class SchemeKpiTargets(TypedDict, total=False):
    survival_pct_min: float
    geo_tagged_pct_min: float
    min_trees: int
    scan_coverage_pct_min: float
    max_days_since_scan: int


class CentralSchemeDefinition(TypedDict, total=False):
    code: str
    label: str
    description: str
    ministry: str
    group: SchemeGroup
    program_codes: list[str]
    default_segment: str
    default_compliance_mode: Literal["open", "guided", "strict"]
    default_template_code: str | None
    checklist_codes: list[str]
    framework_profiles: list[str]
    convergence_allowed: list[str]
    legacy_plantation_category: str | None
    kpi_targets: SchemeKpiTargets
    active: bool
    metadata_sections: list[dict[str, Any]]
    state_codes: list[str]
