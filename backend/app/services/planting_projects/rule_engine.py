"""CMS rule engine — merge admin-editable overrides onto code-defined templates."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_rule_template import PlantingRuleTemplateOverride
from app.models.planting_standard import PlantingStandard
from app.services.planting_projects.templates import StandardTemplate, get_template

# Pilot template editable from Platform CMS → Rule engine tab.
ADMIN_EDITABLE_TEMPLATE_CODES: frozenset[str] = frozenset({"nagar_van_urban_forest_v1"})


def is_admin_editable_template(code: str | None) -> bool:
    return bool(code and code in ADMIN_EDITABLE_TEMPLATE_CODES)


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


def validate_rule_override(rules: dict[str, Any]) -> list[str]:
    """Return human-readable validation errors for CMS rule saves."""
    errors: list[str] = []

    spacing = rules.get("spacing_m")
    if spacing is not None:
        if not isinstance(spacing, dict):
            errors.append("spacing_m must be an object with min and warn_below.")
        else:
            min_val = spacing.get("min")
            if min_val is not None and (not isinstance(min_val, int | float) or min_val <= 0):
                errors.append("spacing_m.min must be a positive number.")

    pit = rules.get("pit_size_cm")
    if pit is not None:
        if not isinstance(pit, dict):
            errors.append("pit_size_cm must be an object with length, width, and depth.")
        else:
            for dim in ("length", "width", "depth"):
                val = pit.get(dim)
                if val is not None and (not isinstance(val, int | float) or val <= 0):
                    errors.append(f"pit_size_cm.{dim} must be a positive number.")

    native_pct = rules.get("species_native_pct_min")
    if native_pct is not None and (
        not isinstance(native_pct, int | float) or native_pct < 0 or native_pct > 100
    ):
        errors.append("species_native_pct_min must be between 0 and 100.")

    min_photos = rules.get("min_photos")
    if min_photos is not None and (
        not isinstance(min_photos, int) or min_photos < 0
    ):
        errors.append("min_photos must be a non-negative integer.")

    max_gps = rules.get("max_gps_accuracy_m")
    if max_gps is not None and (not isinstance(max_gps, int | float) or max_gps <= 0):
        errors.append("max_gps_accuracy_m must be a positive number.")

    density = rules.get("planting_density_per_ha")
    if density is not None:
        if not isinstance(density, dict):
            errors.append("planting_density_per_ha must be an object with min and max.")
        else:
            d_min, d_max = density.get("min"), density.get("max")
            if d_min is not None and d_max is not None and d_min > d_max:
                errors.append("planting_density_per_ha.min cannot exceed max.")

    min_trees = rules.get("min_trees_project")
    if min_trees is not None and (not isinstance(min_trees, int) or min_trees < 1):
        errors.append("min_trees_project must be a positive integer.")

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
    return {
        "template_code": code,
        "name": base["name"],
        "segment": base["segment"],
        "description": base["description"],
        "compliance_mode": base["compliance_mode"],
        "editable": True,
        "code_defaults": base["rules"],
        "override": {
            "enabled": override.enabled if override else False,
            "rules": override.rules if override else {},
            "updated_at": override.updated_at.isoformat() if override and override.updated_at else None,
        },
        "effective_rules": effective_rules,
    }
