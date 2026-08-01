"""Validate and apply central scheme defaults when creating planting projects."""

from __future__ import annotations

from fastapi import HTTPException, status

from app.services.planting_projects.constants import (
    PROGRAM_DEFAULT_COMPLIANCE,
    PROGRAM_DEFAULT_SEGMENT,
)
from app.services.schemes.registry import PROGRAMS_REQUIRING_SCHEME, get_scheme
from app.services.schemes.types import CentralSchemeDefinition


def validate_scheme_selection(
    *,
    scheme_code: str | None,
    program_code: str | None,
) -> CentralSchemeDefinition | None:
    """Return the resolved scheme or raise HTTP 422 on invalid selection."""
    if program_code in PROGRAMS_REQUIRING_SCHEME and not scheme_code:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="scheme_code_required")

    if not scheme_code:
        return None

    scheme = get_scheme(scheme_code)
    if scheme is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="unknown_scheme")
    if not scheme["active"]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="scheme_inactive")
    if program_code and program_code not in scheme["program_codes"]:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="scheme_program_mismatch")
    return scheme


def apply_scheme_defaults(
    *,
    scheme: CentralSchemeDefinition | None,
    segment: str,
    compliance_mode: str,
    program_code: str | None,
    standard_template_code: str | None,
) -> tuple[str, str, str | None]:
    """Apply scheme defaults without overriding explicit non-default user choices."""
    if scheme is None:
        resolved_segment = segment
        if program_code and segment == "general":
            resolved_segment = PROGRAM_DEFAULT_SEGMENT.get(program_code, segment)
        resolved_compliance = compliance_mode
        if program_code and compliance_mode == "guided":
            resolved_compliance = PROGRAM_DEFAULT_COMPLIANCE.get(program_code, compliance_mode)
        return resolved_segment, resolved_compliance, standard_template_code

    resolved_segment = scheme["default_segment"] if segment == "general" else segment
    resolved_compliance = (
        scheme["default_compliance_mode"] if compliance_mode == "guided" else compliance_mode
    )
    resolved_template = standard_template_code or scheme.get("default_template_code")
    return resolved_segment, resolved_compliance, resolved_template
