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


async def resolve_audience_context(db, user: User) -> dict[str, Any]:
    raw_audience = await get_user_planting_audience(db, user)
    audience: AudienceCode = normalize_audience(raw_audience) if raw_audience else "general"
    preset = get_audience_preset(audience)
    enrolled = await list_user_program_codes(db, user.id)

    return {
        "audience": audience,
        "preset": preset_to_dict(preset) if preset else None,
        "enrolled_program_codes": enrolled,
        "default_project": default_project_selection(preset, enrolled),
        "dashboard_highlights": list(preset["dashboard_highlights"]) if preset else ["trees", "map"],
    }
