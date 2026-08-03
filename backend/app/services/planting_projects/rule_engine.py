"""CMS rule engine — merge admin-editable overrides onto code-defined templates."""

from __future__ import annotations

import re
import uuid
from copy import deepcopy
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_custom_template import PlantingCustomTemplate
from app.models.planting_project_rule_override import PlantingProjectRuleOverride
from app.models.planting_rule_template import PlantingRuleTemplateOverride
from app.models.planting_rule_template_version import PlantingRuleTemplateVersion
from app.models.planting_standard import PlantingStandard
from app.services.planting_projects.constants import SEGMENT_LABELS
from app.services.planting_projects.templates import (
    STANDARD_TEMPLATES,
    StandardTemplate,
    get_template,
    list_templates,
)
from app.services.schemes.registry import SCHEME_REGISTRY

CUSTOM_TEMPLATE_PREFIX = "custom_"

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
        "block_types",
        "work_area_geometry",
        "native_species_examples",
        "layout_patterns_allowed",
        "plantation_methods",
        "site_area_acres_reference",
    }
)

ADMIN_EDITABLE_TEMPLATE_CODES: frozenset[str] = frozenset(STANDARD_TEMPLATES.keys())

VALID_TEMPLATE_SEGMENTS: frozenset[str] = frozenset(SEGMENT_LABELS.keys())


def is_custom_template_code(code: str | None) -> bool:
    return bool(code and code.startswith(CUSTOM_TEMPLATE_PREFIX))


def list_editable_template_codes() -> list[str]:
    return sorted(ADMIN_EDITABLE_TEMPLATE_CODES)


async def list_all_template_codes(db: AsyncSession, *, include_archived: bool = False) -> list[str]:
    codes = list(list_editable_template_codes())
    custom_rows = await list_custom_templates(db, include_archived=include_archived)
    codes.extend(row.template_code for row in custom_rows)
    return sorted(set(codes))


def is_admin_editable_template(code: str | None) -> bool:
    return bool(code and (code in ADMIN_EDITABLE_TEMPLATE_CODES or is_custom_template_code(code)))


def slugify_template_code(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    slug = slug[:48] or "template"
    return f"{CUSTOM_TEMPLATE_PREFIX}{slug}"


def bootstrap_rules_from_clone(clone_from: str | None) -> dict[str, Any]:
    if clone_from:
        src = get_template(clone_from)
        if src:
            return deepcopy(src["rules"])
    open_tpl = get_template("open_byot_v1")
    return deepcopy(open_tpl["rules"]) if open_tpl else {}


def sanitize_custom_rules(rules: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in rules.items() if key in OVERRIDABLE_RULE_KEYS and value is not None}


def custom_row_to_standard(row: PlantingCustomTemplate) -> StandardTemplate:
    return {
        "code": row.template_code,
        "name": row.name,
        "segment": row.segment,
        "description": row.description,
        "compliance_mode": row.compliance_mode,
        "recommended_program_codes": list(row.recommended_program_codes or []),
        "rules": dict(row.rules or {}),
    }


async def get_custom_template_row(
    db: AsyncSession, template_code: str, *, include_archived: bool = False
) -> PlantingCustomTemplate | None:
    res = await db.execute(
        select(PlantingCustomTemplate).where(PlantingCustomTemplate.template_code == template_code)
    )
    row = res.scalar_one_or_none()
    if row is None or (row.archived and not include_archived):
        return None
    return row


async def list_custom_templates(
    db: AsyncSession, *, segment: str | None = None, include_archived: bool = False
) -> list[PlantingCustomTemplate]:
    stmt = select(PlantingCustomTemplate).order_by(PlantingCustomTemplate.name.asc())
    if not include_archived:
        stmt = stmt.where(PlantingCustomTemplate.archived.is_(False))
    if segment:
        stmt = stmt.where(PlantingCustomTemplate.segment == segment)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def ensure_unique_template_code(db: AsyncSession, base_code: str) -> str:
    code = base_code
    suffix = 2
    while get_template(code) is not None or await get_custom_template_row(
        db, code, include_archived=True
    ):
        code = f"{base_code}_{suffix}"
        suffix += 1
        if len(code) > 64:
            code = f"{base_code[:56]}_{suffix}"
    return code


async def resolve_template_base(
    db: AsyncSession | None, template_code: str
) -> StandardTemplate | None:
    if db is not None and is_custom_template_code(template_code):
        row = await get_custom_template_row(db, template_code)
        if row:
            return custom_row_to_standard(row)
    return get_template(template_code)


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

    for list_key in (
        "block_types",
        "native_species_examples",
        "layout_patterns_allowed",
        "plantation_methods",
    ):
        val = rules.get(list_key)
        if val is not None and not isinstance(val, list):
            errors.append(f"{list_key} must be a list of strings.")

    cm = rules.get("compliance_mode")
    if cm is not None and cm not in ("open", "guided", "strict"):
        errors.append("compliance_mode must be open, guided, or strict.")

    return errors


def _override_is_active(
    row: PlantingRuleTemplateOverride | None,
    *,
    now: datetime | None = None,
) -> bool:
    if row is None or not row.enabled:
        return False
    if row.effective_from is not None:
        now = now or datetime.now(UTC)
        effective = row.effective_from
        if effective.tzinfo is None:
            effective = effective.replace(tzinfo=UTC)
        if effective > now:
            return False
    return True


async def get_project_override_row(
    db: AsyncSession, project_id: uuid.UUID
) -> PlantingProjectRuleOverride | None:
    res = await db.execute(
        select(PlantingProjectRuleOverride).where(
            PlantingProjectRuleOverride.project_id == project_id
        )
    )
    return res.scalar_one_or_none()


async def next_version_number(db: AsyncSession, template_code: str) -> int:
    res = await db.execute(
        select(func.max(PlantingRuleTemplateVersion.version_number)).where(
            PlantingRuleTemplateVersion.template_code == template_code
        )
    )
    current = res.scalar_one_or_none()
    return int(current or 0) + 1


async def record_template_version(
    db: AsyncSession,
    *,
    template_code: str,
    rules: dict[str, Any],
    compliance_mode: str | None,
    enabled: bool,
    effective_from: datetime | None,
    publish_note: str | None,
    actor_user_id: uuid.UUID | None,
    is_rollback: bool = False,
) -> PlantingRuleTemplateVersion:
    version = PlantingRuleTemplateVersion(
        template_code=template_code,
        version_number=await next_version_number(db, template_code),
        rules=rules,
        compliance_mode=compliance_mode,
        enabled=enabled,
        effective_from=effective_from,
        publish_note=publish_note,
        is_rollback=is_rollback,
        created_by_user_id=actor_user_id,
        created_at=datetime.now(UTC),
    )
    db.add(version)
    await db.flush()
    return version


async def list_template_versions(
    db: AsyncSession, template_code: str, *, limit: int = 50
) -> list[PlantingRuleTemplateVersion]:
    res = await db.execute(
        select(PlantingRuleTemplateVersion)
        .where(PlantingRuleTemplateVersion.template_code == template_code)
        .order_by(PlantingRuleTemplateVersion.version_number.desc())
        .limit(limit)
    )
    return list(res.scalars().all())


def version_to_dict(version: PlantingRuleTemplateVersion) -> dict[str, Any]:
    return {
        "id": str(version.id),
        "template_code": version.template_code,
        "version_number": version.version_number,
        "rules": version.rules,
        "compliance_mode": version.compliance_mode,
        "enabled": version.enabled,
        "effective_from": version.effective_from.isoformat() if version.effective_from else None,
        "publish_note": version.publish_note,
        "is_rollback": version.is_rollback,
        "created_by_user_id": str(version.created_by_user_id) if version.created_by_user_id else None,
        "created_at": version.created_at.isoformat() if version.created_at else None,
    }


def build_scheme_template_map() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for scheme in SCHEME_REGISTRY.values():
        tpl_code = scheme.get("default_template_code")
        tpl = get_template(tpl_code) if tpl_code else None
        rows.append(
            {
                "scheme_code": scheme["code"],
                "scheme_label": scheme["label"],
                "ministry": scheme["ministry"],
                "default_template_code": tpl_code,
                "template_name": tpl["name"] if tpl else None,
                "default_compliance_mode": scheme["default_compliance_mode"],
                "checklist_codes": scheme.get("checklist_codes", []),
            }
        )
    return sorted(rows, key=lambda r: r["scheme_label"])


def export_templates_bundle(db_rows: dict[str, PlantingRuleTemplateOverride | None]) -> dict[str, Any]:
    exported_at = datetime.now(UTC).isoformat()
    templates: list[dict[str, Any]] = []
    for tpl in list_templates():
        code = tpl["code"]
        row = db_rows.get(code)
        templates.append(
            {
                "template_code": code,
                "name": tpl["name"],
                "override": {
                    "enabled": row.enabled if row else False,
                    "rules": row.rules if row else {},
                    "compliance_mode": row.compliance_mode if row else None,
                    "effective_from": row.effective_from.isoformat()
                    if row and row.effective_from
                    else None,
                    "publish_note": row.publish_note if row else None,
                },
            }
        )
    return {"exported_at": exported_at, "version": 2, "templates": templates}


async def resolve_template_rules(
    db: AsyncSession | None,
    *,
    template_code: str | None,
    fallback_rules: dict[str, Any] | None = None,
    project_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    """Resolve rules: code/custom template → CMS override → project override."""
    rules: dict[str, Any] = {}
    if template_code and is_admin_editable_template(template_code):
        if db is not None and is_custom_template_code(template_code):
            row = await get_custom_template_row(db, template_code)
            if row:
                rules = deepcopy(row.rules or {})
        else:
            base = get_template(template_code)
            if base:
                rules = deepcopy(base["rules"])
                if db is not None:
                    override_row = await get_template_override_row(db, template_code)
                    if _override_is_active(override_row) and override_row and override_row.rules:
                        rules = merge_rules(rules, override_row.rules)
    elif fallback_rules:
        rules = deepcopy(fallback_rules)

    if db is not None and project_id is not None:
        proj_row = await get_project_override_row(db, project_id)
        if proj_row and proj_row.enabled and proj_row.rules:
            rules = merge_rules(rules, proj_row.rules)

    return rules


async def resolve_compliance_mode(
    db: AsyncSession | None,
    *,
    template_code: str | None,
    project_compliance_mode: str,
    project_id: uuid.UUID | None = None,
) -> str:
    mode = project_compliance_mode
    if db is not None and template_code:
        if is_custom_template_code(template_code):
            row = await get_custom_template_row(db, template_code)
            if row:
                mode = row.compliance_mode
        else:
            row = await get_template_override_row(db, template_code)
            if _override_is_active(row) and row and row.compliance_mode:
                mode = row.compliance_mode
    if db is not None and project_id is not None:
        proj_row = await get_project_override_row(db, project_id)
        if proj_row and proj_row.enabled and proj_row.compliance_mode:
            mode = proj_row.compliance_mode
    return mode


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
    if db is not None and is_custom_template_code(code):
        row = await get_custom_template_row(db, code)
        if row:
            return custom_row_to_standard(row)
        return None

    base = get_template(code)
    if base is None:
        return None
    if db is None or not is_admin_editable_template(code):
        return base

    row = await get_template_override_row(db, code)
    if not _override_is_active(row) or row is None or not row.rules:
        effective = dict(base)
        if row and row.compliance_mode:
            effective["compliance_mode"] = row.compliance_mode
        return effective  # type: ignore[return-value]

    effective = dict(base)
    effective["rules"] = merge_rules(base["rules"], row.rules)
    if row.compliance_mode:
        effective["compliance_mode"] = row.compliance_mode
    return effective  # type: ignore[return-value]


async def get_effective_rules(
    db: AsyncSession | None,
    standard: PlantingStandard | None,
    *,
    project_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    if standard is None:
        return {}
    return await resolve_template_rules(
        db,
        template_code=standard.template_code,
        fallback_rules=standard.rules,
        project_id=project_id,
    )


def rule_template_admin_dict(
    *,
    code: str,
    base: StandardTemplate,
    override: PlantingRuleTemplateOverride | None,
    effective_rules: dict[str, Any],
    effective_compliance_mode: str | None = None,
    source: str = "code",
    archived: bool = False,
) -> dict[str, Any]:
    is_custom = source == "custom"
    has_custom_rules = is_custom or bool(override and override.enabled and override.rules)
    eff_mode = effective_compliance_mode or (
        override.compliance_mode if override and override.compliance_mode else base["compliance_mode"]
    )
    return {
        "template_code": code,
        "name": base["name"],
        "segment": base["segment"],
        "segment_label": SEGMENT_LABELS.get(base["segment"], base["segment"].replace("_", " ")),
        "description": base["description"],
        "compliance_mode": eff_mode,
        "code_compliance_mode": base["compliance_mode"],
        "recommended_program_codes": base["recommended_program_codes"],
        "editable": True,
        "source": source,
        "is_custom": is_custom,
        "archived": archived,
        "has_custom_rules": has_custom_rules,
        "code_defaults": base["rules"],
        "override": {
            "enabled": True if is_custom else (override.enabled if override else False),
            "rules": effective_rules if is_custom else (override.rules if override else {}),
            "compliance_mode": eff_mode if is_custom else (override.compliance_mode if override else None),
            "effective_from": None
            if is_custom
            else (
                override.effective_from.isoformat()
                if override and override.effective_from
                else None
            ),
            "publish_note": None if is_custom else (override.publish_note if override else None),
            "updated_at": None
            if is_custom
            else (override.updated_at.isoformat() if override and override.updated_at else None),
        },
        "effective_rules": effective_rules,
    }


async def build_rule_template_admin_entry(
    db: AsyncSession, code: str
) -> dict[str, Any] | None:
    if is_custom_template_code(code):
        row = await get_custom_template_row(db, code)
        if row is None:
            return None
        base = custom_row_to_standard(row)
        return rule_template_admin_dict(
            code=code,
            base=base,
            override=None,
            effective_rules=dict(row.rules or {}),
            effective_compliance_mode=row.compliance_mode,
            source="custom",
            archived=row.archived,
        )

    base = get_template(code)
    if base is None:
        return None
    override = await get_template_override_row(db, code)
    effective_tpl = await get_effective_template(db, code)
    effective_rules = dict(effective_tpl["rules"]) if effective_tpl else dict(base["rules"])
    eff_mode = effective_tpl["compliance_mode"] if effective_tpl else base["compliance_mode"]
    return rule_template_admin_dict(
        code=code,
        base=base,
        override=override,
        effective_rules=effective_rules,
        effective_compliance_mode=eff_mode,
        source="code",
    )


def project_rule_override_dict(
    *,
    project_id: uuid.UUID,
    template_code: str | None,
    base_rules: dict[str, Any],
    effective_rules: dict[str, Any],
    row: PlantingProjectRuleOverride | None,
    project_compliance_mode: str,
) -> dict[str, Any]:
    return {
        "project_id": str(project_id),
        "template_code": template_code,
        "project_compliance_mode": project_compliance_mode,
        "effective_compliance_mode": row.compliance_mode
        if row and row.enabled and row.compliance_mode
        else project_compliance_mode,
        "has_project_override": bool(row and row.enabled and row.rules),
        "base_rules": base_rules,
        "effective_rules": effective_rules,
        "override": {
            "enabled": row.enabled if row else False,
            "rules": row.rules if row else {},
            "compliance_mode": row.compliance_mode if row else None,
            "publish_note": row.publish_note if row else None,
            "updated_at": row.updated_at.isoformat() if row and row.updated_at else None,
        },
    }
