"""Resolve audience presets into project defaults and dashboard context."""

from __future__ import annotations

from typing import Any, TypedDict

from app.models.user import User
from app.services.onboarding.audience import AudienceCode, normalize_audience
from app.services.onboarding.audience_presets import (
    AudiencePreset,
    get_audience_preset,
    preset_to_dict,
)
from app.services.onboarding.audience_storage import get_user_planting_audience
from app.services.planting_programs.enrollment import list_user_program_codes
from app.services.schemes.registry import list_schemes


class DefaultProjectSelection(TypedDict, total=False):
    program_code: str
    scheme_code: str | None
    template_code: str | None
    segment: str


def default_project_selection(
    preset: AudiencePreset | None,
    enrolled_program_codes: list[str],
) -> DefaultProjectSelection:
    if preset is None:
        return {}

    program_code = preset["recommended_program_code"]
    if enrolled_program_codes and program_code not in enrolled_program_codes:
        for code in enrolled_program_codes:
            if code != "byot":
                program_code = code
                break

    scheme_codes = preset.get("recommended_scheme_codes") or []
    return {
        "program_code": program_code,
        "scheme_code": scheme_codes[0] if scheme_codes else None,
        "template_code": preset.get("recommended_template_code"),
        "segment": preset.get("recommended_segment", "general"),
    }


def _scheme_recommendations(
    preset: AudiencePreset | None,
    audience: AudienceCode,
    enrolled_program_codes: list[str],
) -> list[dict[str, Any]]:
    if preset is None:
        return []

    program_code = default_project_selection(preset, enrolled_program_codes).get("program_code")
    schemes = list_schemes(
        program_code=program_code,
        audience=audience,
        active_only=True,
    )
    recommended = set(preset.get("recommended_scheme_codes") or [])
    rows: list[dict[str, Any]] = []
    for scheme in schemes:
        if scheme["code"] not in recommended and scheme["group"] != "state":
            continue
        rows.append(
            {
                "code": scheme["code"],
                "label": scheme["label"],
                "group": scheme["group"],
                "default_segment": scheme["default_segment"],
                "default_template_code": scheme["default_template_code"],
                "checklist_codes": list(scheme.get("checklist_codes") or []),
                "state_codes": list(scheme.get("state_codes") or []),
                "primary": scheme["code"] in recommended,
            }
        )
    rows.sort(key=lambda row: (not row["primary"], row["label"]))
    return rows


def _journey_steps(
    audience: AudienceCode,
    preset: AudiencePreset | None,
    *,
    fra_required: bool,
) -> list[dict[str, str]]:
    if preset is None:
        return []

    steps: list[dict[str, str]] = [
        {
            "id": "create_project",
            "title": "Create a scheme-linked project",
            "description": (
                f"Start with {preset['recommended_scheme_codes'][0]}"
                if preset.get("recommended_scheme_codes")
                else "Pick a central or state scheme template"
            ),
            "href": "/projects/new",
        },
    ]

    if fra_required:
        steps.append(
            {
                "id": "fra_safeguards",
                "title": "Upload FRA / tenure safeguards",
                "description": (
                    "Gram sabha resolution, FPIC minutes, and patta/CFR references "
                    "for community and government land."
                ),
                "href": "/portfolio-health?tab=compliance",
            }
        )

    if audience == "mining":
        steps.append(
            {
                "id": "closure_baseline",
                "title": "Record PMCP closure baseline",
                "description": "Link mine lease, map green-belt blocks, and set closure phase.",
                "href": "/projects/new",
            }
        )
    elif audience == "corporate_esg":
        steps.append(
            {
                "id": "brsr_exports",
                "title": "Prepare BRSR Principle 6 evidence",
                "description": "Export plantation and geo-MRV data for board reporting.",
                "href": "/reports?tab=brsr",
            }
        )
    elif audience == "ngo_community":
        steps.append(
            {
                "id": "mgnrega_convergence",
                "title": "Configure MGNREGA convergence",
                "description": "Link gram panchayat, job card refs, and watershed blocks.",
                "href": "/projects/new",
            }
        )
    elif audience == "government":
        steps.append(
            {
                "id": "state_schemes",
                "title": "Browse state scheme catalog",
                "description": "Filter schemes by state code when creating projects.",
                "href": "/projects/new",
            }
        )

    steps.append(
        {
            "id": "field_ops",
            "title": "Run field operations queue",
            "description": "Track violations, survival checks, and audit plot visits.",
            "href": "/field-ops",
        }
    )
    return steps


async def resolve_audience_context(db, user: User) -> dict[str, Any]:
    raw_audience = await get_user_planting_audience(db, user)
    audience: AudienceCode = normalize_audience(raw_audience) if raw_audience else "general"
    preset = get_audience_preset(audience)
    enrolled = await list_user_program_codes(db, user.id)
    checklist_codes = list(preset["checklist_codes"]) if preset else []
    fra_required = "fra_tenure" in checklist_codes

    scheme_recommendations = _scheme_recommendations(preset, audience, enrolled)
    state_schemes = [
        row for row in scheme_recommendations if row.get("state_codes")
    ]

    return {
        "audience": audience,
        "preset": preset_to_dict(preset) if preset else None,
        "enrolled_program_codes": enrolled,
        "default_project": default_project_selection(preset, enrolled),
        "dashboard_highlights": list(preset["dashboard_highlights"]) if preset else ["trees", "map"],
        "scheme_recommendations": scheme_recommendations,
        "state_schemes": state_schemes,
        "fra_required": fra_required,
        "fra_guidance": (
            "Upload gram sabha resolutions, FPIC minutes, and tenure references "
            "in each project's Compliance → Safeguards tab before external audits."
            if fra_required
            else None
        ),
        "journey_steps": _journey_steps(audience, preset, fra_required=fra_required),
    }
