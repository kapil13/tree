"""CMS rule engine — merge admin-editable overrides onto code-defined templates."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_rule_template import PlantingRuleTemplateOverride
from app.models.planting_standard import PlantingStandard
from app.services.planting_projects.constants import SEGMENT_LABELS
from app.services.planting_projects.templates import (
    STANDARD_TEMPLATES,
    StandardTemplate,
    get_template,
)

# Keys platform admins may override via CMS (subset of full template rules).
OVERRIDABLE_RULE_KEYS: frozenset[str] = frozenset(
    {
        "spacing_m",
        "spacing_conventional_m",
        "pit_size_cm",
        "pit_size_conventional_cm",
        "max_gps_accuracy_m",
        "min_photos",
        "guard_type_required",
        "layout_pattern",
        "allowed_species",
        "species_native_pct_min",
        "planting_density_per_ha",
        "planting_density_conventional_per_ha",
        "require_pit_photo",
        "chainage_enabled",
        "min_trees_project",
        "site_area_acres_min",
        "community_participation_min_pct",
        "rainwater_harvest_required",
        "soil_treatment_required",
        "organic_manure_required",
        "cooperative_led",
        "arid_land_optimized",
    }
)

ADMIN_EDITABLE_TEMPLATE_CODES: frozenset[str] = frozenset(STANDARD_TEMPLATES.keys())


def list_editable_template_codes() -> list[str]:
    return sorted(ADMIN_EDITABLE_TEMPLATE_CODES)


def is_admin_editable_template(code: str | None) -> bool:
    return bool(code and code in ADMIN_EDITABLE_TEMPLATE_CODES)


def sanitize_override_rules(base_rules: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    """Keep only known override keys that exist on the base template (or are universal)."""
    allowed = OVERRIDABLE_RULE_KEYS & (set(base_rules.keys()) | OVERRIDABLE_RULE_KEYS)
    return {key: value for key, value in override.items() if key in allowed and value is not None}


def merge_rules(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    """Shallow-merge top-level keys; nested dicts (spacing_m, pit_size_cm) merge one level."""
    merged = deepcopy(base)
    for key, value in override.items():
        if value is None:
            continue
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = {**merged[key], **value}
        else:
            merged[key] = value
    return merged


def _validate_spacing_block(spacing: Any, label: str, errors: list[str]) -> None:
    if spacing is None:
        return
    if not isinstance(spacing, dict):
        errors.append(f"{label} must be an object with min and warn_below.")
        return
    min_val = spacing.get("min")
    if min_val is not None and (not isinstance(min_val, int | float) or min_val <= 0):
        errors.append(f"{label}.min must be a positive number.")


def _validate_pit_block(pit: Any, label: str, errors: list[str]) -> None:
    if pit is None:
        return
    if not isinstance(pit, dict):
        errors.append(f"{label} must be an object with length, width, and depth.")
        return
    for dim in ("length", "width", "depth"):
        val = pit.get(dim)
        if val is not None and (not isinstance(val, int | float) or val <= 0):
            errors.append(f"{label}.{dim} must be a positive number.")


def _validate_density_block(density: Any, label: str, errors: list[str]) -> None:
    if density is None:
        return
    if not isinstance(density, dict):
        errors.append(f"{label} must be an object with min and max.")
        return
    d_min, d_max = density.get("min"), density.get("max")
    if d_min is not None and d_max is not None and d_min > d_max:
        errors.append(f"{label}.min cannot exceed max.")


def validate_rule_override(rules: dict[str, Any]) -> list[str]:
    """Return human-readable validation errors for CMS rule saves."""
    errors: list[str] = []

    _validate_spacing_block(rules.get("spacing_m"), "spacing_m", errors)
    _validate_spacing_block(rules.get("spacing_conventional_m"), "spacing_conventional_m", errors)
    _validate_pit_block(rules.get("pit_size_cm"), "pit_size_cm", errors)
    _validate_pit_block(rules.get("pit_size_conventional_cm"), "pit_size_conventional_cm", errors)

    native_pct = rules.get("species_native_pct_min")
    if native_pct is not None and (
        not isinstance(native_pct, int | float) or native_pct < 0 or native_pct > 100
    ):
        errors.append("species_native_pct_min must be between 0 and 100.")

    min_photos = rules.get("min_photos")
    if min_photos is not None and (not isinstance(min_photos, int) or min_photos < 0):
        errors.append("min_photos must be a non-negative integer.")

    max_gps = rules.get("max_gps_accuracy_m")
    if max_gps is not None and (not isinstance(max_gps, int | float) or max_gps <= 0):
        errors.append("max_gps_accuracy_m must be a positive number.")

    _validate_density_block(rules.get("planting_density_per_ha"), "planting_density_per_ha", errors)
    _validate_density_block(
        rules.get("planting_density_conventional_per_ha"),
        "planting_density_conventional_per_ha",
        errors,
    )

    min_trees = rules.get("min_trees_project")
    if min_trees is not None and (not isinstance(min_trees, int) or min_trees < 1):
        errors.append("min_trees_project must be a positive integer.")

    community_pct = rules.get("community_participation_min_pct")
    if community_pct is not None and (
        not isinstance(community_pct, int | float) or community_pct < 0 or community_pct > 100
    ):
        errors.append("community_participation_min_pct must be between 0 and 100.")

    allowed_species = rules.get("allowed_species")
    if allowed_species is not None and not isinstance(allowed_species, list):
        errors.append("allowed_species must be a list of species names.")

    return errors


async def get_template_override_row(
    db: AsyncSession, template_code: str
) -> PlantingRuleTemplateOverride | None:
    res = await db.execute(
        select(PlantingRuleTemplateOverride).where(
            PlantingRuleTemplateOverride.template_code == template_code
        )
    )
    return res.scalar_one_or_none()


async def get_effective_template(
    db: AsyncSession | None, code: str
) -> StandardTemplate | None:
    base = get_template(code)
    if base is None:
        return None
    if db is None or not is_admin_editable_template(code):
        return base

    row = await get_template_override_row(db, code)
    if row is None or not row.enabled or not row.rules:
        return base

    effective = dict(base)
    effective["rules"] = merge_rules(base["rules"], row.rules)
    return effective  # type: ignore[return-value]


async def get_effective_rules(
    db: AsyncSession | None, standard: PlantingStandard | None
) -> dict[str, Any]:
    if standard is None:
        return {}
    if db is not None and is_admin_editable_template(standard.template_code):
        tpl = await get_effective_template(db, standard.template_code)  # type: ignore[arg-type]
        if tpl:
            return dict(tpl["rules"])
    return dict(standard.rules or {})


def rule_template_admin_dict(
    *,
    code: str,
    base: StandardTemplate,
    override: PlantingRuleTemplateOverride | None,
    effective_rules: dict[str, Any],
) -> dict[str, Any]:
    has_custom_rules = bool(override and override.enabled and override.rules)
    return {
        "template_code": code,
        "name": base["name"],
        "segment": base["segment"],
        "segment_label": SEGMENT_LABELS.get(base["segment"], base["segment"].replace("_", " ")),
        "description": base["description"],
        "compliance_mode": base["compliance_mode"],
        "recommended_program_codes": base["recommended_program_codes"],
        "editable": True,
        "has_custom_rules": has_custom_rules,
        "code_defaults": base["rules"],
        "override": {
            "enabled": override.enabled if override else False,
            "rules": override.rules if override else {},
            "updated_at": override.updated_at.isoformat() if override and override.updated_at else None,
        },
        "effective_rules": effective_rules,
    }
