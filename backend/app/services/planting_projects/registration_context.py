"""Registration context for in-project tree registration (Sprint B)."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.models.planting_standard import PlantingStandard
from app.models.tree import Tree
from app.services.geo import point_at_chainage_km
from app.services.planting_projects.rule_engine import get_effective_rules
from app.services.planting_projects.service import get_active_standard, project_summary


def format_chainage_label(chainage_km: float) -> str:
    """Format 142.38 km as highway-style chainage label ``142+380``."""
    whole = int(chainage_km)
    meters = round((chainage_km - whole) * 1000)
    if meters >= 1000:
        whole += 1
        meters = 0
    return f"{whole}+{meters:03d}"


def format_chainage_display(chainage_km: float) -> str:
    return f"KM {format_chainage_label(chainage_km)}"


def inherited_standard_from_rules(rules: dict[str, Any]) -> dict[str, Any]:
    pit = rules.get("pit_size_cm") if isinstance(rules.get("pit_size_cm"), dict) else None
    spacing = rules.get("spacing_m") if isinstance(rules.get("spacing_m"), dict) else None
    pit_label = None
    if pit:
        parts = [pit.get("length"), pit.get("width"), pit.get("depth")]
        if all(p is not None for p in parts):
            pit_label = "×".join(str(int(p)) for p in parts)
    return {
        "pit_size_cm": pit,
        "pit_size_label": pit_label,
        "spacing_m_min": spacing.get("min") if spacing else None,
        "guard_type_required": bool(rules.get("guard_type_required")),
        "require_pit_photo": bool(rules.get("require_pit_photo")),
        "chainage_enabled": bool(rules.get("chainage_enabled")),
        "min_photos": rules.get("min_photos"),
        "allowed_species": rules.get("allowed_species"),
        "species_native_pct_min": rules.get("species_native_pct_min"),
    }


def merge_standard_into_tree_metadata(
    metadata: dict[str, Any],
    rules: dict[str, Any],
) -> dict[str, Any]:
    """Fill omitted per-tree metadata from project planting standard."""
    merged = dict(metadata)
    pit_rules = rules.get("pit_size_cm")
    if pit_rules and isinstance(pit_rules, dict) and not merged.get("pit_size_cm"):
        length = pit_rules.get("length")
        width = pit_rules.get("width")
        depth = pit_rules.get("depth")
        if length is not None and width is not None and depth is not None:
            merged["pit_size_cm"] = f"{int(length)}×{int(width)}×{int(depth)}"

    spacing_rules = rules.get("spacing_m")
    if spacing_rules and isinstance(spacing_rules, dict) and not merged.get("spacing_m"):
        min_spacing = spacing_rules.get("min")
        if min_spacing is not None:
            merged["spacing_m"] = str(min_spacing)

    if rules.get("guard_type_required") and not merged.get("guard_type"):
        merged["guard_type"] = "bamboo"

    native_min = rules.get("species_native_pct_min")
    if native_min is not None and float(native_min) >= 80 and merged.get("species_native") is None:
        merged["species_native"] = True

    return merged


def _set_if_empty(merged: dict[str, Any], key: str, value: Any) -> None:
    if value is None or value == "":
        return
    current = merged.get(key)
    if current is None or current == "":
        merged[key] = value


_PLANTATION_CATEGORY_LEGAL: dict[str, tuple[str, str]] = {
    "highway": ("highway_plantation", "highway_row"),
    "forest_ca": ("compensatory_afforestation", "forest"),
    "municipal": ("urban_greening", "urban"),
    "other_government": ("other", "govt_land"),
}

_SEGMENT_LEGAL: dict[str, tuple[str, str]] = {
    "nhai_highway": ("highway_plantation", "highway_row"),
    "nagar_van_urban": ("urban_greening", "urban"),
    "sahakar_van_coop": ("other", "govt_land"),
    "township_landscape": ("urban_greening", "urban"),
    "industrial_greenbelt": ("other", "govt_land"),
    "ngo_watershed": ("other", "govt_land"),
    "general": ("other", "govt_land"),
}


def _apply_legal_land_fallbacks(merged: dict[str, Any], project: PlantingProject) -> None:
    """Fill legal_basis + land_category from plantation category or project segment."""
    meta = project.metadata_ or {}
    category = meta.get("plantation_category")
    if isinstance(category, str):
        pair = _PLANTATION_CATEGORY_LEGAL.get(category)
        if pair:
            _set_if_empty(merged, "legal_basis", pair[0])
            _set_if_empty(merged, "land_category", pair[1])
        if category == "highway":
            _set_if_empty(merged, "implementing_agency", "NHAI / contractor")

    segment = getattr(project, "segment", None)
    if isinstance(segment, str):
        pair = _SEGMENT_LEGAL.get(segment)
        if pair:
            _set_if_empty(merged, "legal_basis", pair[0])
            _set_if_empty(merged, "land_category", pair[1])
        if segment == "nhai_highway":
            _set_if_empty(merged, "implementing_agency", "NHAI / contractor")


def merge_project_into_tree_metadata(
    metadata: dict[str, Any],
    *,
    project: PlantingProject,
    rules: dict[str, Any],
    surveyor_name: str | None = None,
) -> dict[str, Any]:
    """Apply planting standard + scheme refs + project defaults for in-project registration."""
    merged = merge_standard_into_tree_metadata(metadata, rules)
    refs = (project.metadata_ or {}).get("scheme_refs")
    refs = refs if isinstance(refs, dict) else {}
    stored_defaults = (project.metadata_ or {}).get("tree_registration_defaults")
    stored_defaults = stored_defaults if isinstance(stored_defaults, dict) else {}

    for key in (
        "permit_reference",
        "site_zone",
        "implementing_agency",
        "maintenance_responsible",
        "legal_basis",
        "land_category",
    ):
        _set_if_empty(merged, key, stored_defaults.get(key))

    _set_if_empty(merged, "project_code", project.code)

    if project.scheme_code == "campa_ca":
        _set_if_empty(merged, "legal_basis", "compensatory_afforestation")
        _set_if_empty(merged, "land_category", "forest")
        _set_if_empty(
            merged,
            "permit_reference",
            refs.get("pca_number") or refs.get("forest_diversion_id"),
        )
        _set_if_empty(
            merged,
            "site_zone",
            refs.get("ca_land_parcel_id") or refs.get("state_name"),
        )
        _set_if_empty(
            merged,
            "implementing_agency",
            refs.get("state_campa_account") or refs.get("state_name"),
        )
    elif project.scheme_code == "nagar_van":
        _set_if_empty(merged, "legal_basis", "urban_greening")
        _set_if_empty(merged, "land_category", "urban")
    elif project.scheme_code == "sahakar_van":
        _set_if_empty(merged, "legal_basis", "other")
        _set_if_empty(merged, "land_category", "govt_land")
        _set_if_empty(merged, "consent_reference", refs.get("nccf_project_ref"))
    elif project.scheme_code == "nhai_highway":
        _set_if_empty(merged, "legal_basis", "highway_plantation")
        _set_if_empty(merged, "land_category", "highway_row")
        _set_if_empty(merged, "implementing_agency", "NHAI / contractor")
        _set_if_empty(
            merged,
            "permit_reference",
            refs.get("nhai_package_code") or refs.get("package_code"),
        )
        highway = refs.get("highway_number")
        if highway:
            _set_if_empty(merged, "site_zone", f"NH {highway}")

    village = refs.get("village_name") or refs.get("ulb_name")
    _set_if_empty(merged, "site_zone", village)
    _set_if_empty(merged, "panchayat_village", refs.get("village_name"))
    _set_if_empty(merged, "community_name", refs.get("cooperative_society_name"))
    _set_if_empty(
        merged,
        "implementing_agency",
        refs.get("amul_union_name")
        or refs.get("ulb_name")
        or refs.get("cooperative_society_name"),
    )
    _set_if_empty(
        merged,
        "permit_reference",
        refs.get("nccf_project_ref") or refs.get("nagar_van_project_id"),
    )

    _set_if_empty(merged, "survival_status", "live")
    if surveyor_name:
        _set_if_empty(merged, "surveyor_name", surveyor_name)
    project_name = getattr(project, "name", None)
    maintenance = (
        merged.get("implementing_agency")
        or refs.get("state_campa_account")
        or refs.get("state_name")
        or surveyor_name
        or project_name
    )
    _set_if_empty(merged, "maintenance_responsible", maintenance)

    if not merged.get("permit_reference"):
        _set_if_empty(merged, "permit_reference", project.code)
    if not merged.get("site_zone"):
        _set_if_empty(merged, "site_zone", project_name)

    _apply_legal_land_fallbacks(merged, project)

    return merged


def _parse_chainage_km(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, int | float):
        return float(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if "+" in text:
            parts = text.split("+", 1)
            try:
                whole = float(parts[0])
                meters = float(parts[1])
                return round(whole + meters / 1000.0, 3)
            except ValueError:
                pass
        try:
            return float(text)
        except ValueError:
            return None
    return None


async def _max_chainage_in_work_area(
    db: AsyncSession,
    work_area_id: uuid.UUID,
) -> float | None:
    res = await db.execute(
        select(Tree.metadata_).where(
            Tree.plantation_id == work_area_id,
            Tree.status != "removed",
        )
    )
    max_km: float | None = None
    for (meta,) in res.all():
        if not isinstance(meta, dict):
            continue
        km = _parse_chainage_km(meta.get("chainage_km"))
        if km is None:
            continue
        max_km = km if max_km is None else max(max_km, km)
    return max_km


def _pick_work_area(
    work_areas: list[PlantationFence],
    *,
    chainage_enabled: bool,
) -> PlantationFence | None:
    if not work_areas:
        return None
    if chainage_enabled:
        for area in work_areas:
            if area.geometry_type == "corridor" and (area.metadata_ or {}).get("source_geometry"):
                return area
    return work_areas[0]


async def build_registration_context(
    db: AsyncSession,
    project: PlantingProject,
    *,
    work_area_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    standard: PlantingStandard | None = await get_active_standard(db, project)
    rules = await get_effective_rules(db, standard, project_id=project.id)
    inherited = inherited_standard_from_rules(rules)
    summary = await project_summary(db, project)

    res = await db.execute(
        select(PlantationFence)
        .where(PlantationFence.project_id == project.id)
        .order_by(PlantationFence.created_at.asc())
    )
    work_areas = list(res.scalars().all())

    selected = None
    if work_area_id:
        selected = next((a for a in work_areas if a.id == work_area_id), None)
    if selected is None:
        selected = _pick_work_area(work_areas, chainage_enabled=inherited["chainage_enabled"])

    suggested_next: dict[str, Any] | None = None
    if selected is not None:
        spacing_min = inherited.get("spacing_m_min")
        spacing_km = float(spacing_min) / 1000.0 if spacing_min else 0.006

        max_km = await _max_chainage_in_work_area(db, selected.id)
        if max_km is not None:
            next_km = round(max_km + spacing_km, 3)
        elif selected.chainage_start_km is not None:
            next_km = float(selected.chainage_start_km)
        else:
            next_km = None

        if next_km is not None and selected.chainage_end_km is not None:
            next_km = min(next_km, float(selected.chainage_end_km))

        lat: float | None = None
        lon: float | None = None
        source = (selected.metadata_ or {}).get("source_geometry")
        if next_km is not None and source:
            point = point_at_chainage_km(source, next_km)
            if point:
                lat, lon = point

        if next_km is not None:
            suggested_next = {
                "work_area_id": str(selected.id),
                "work_area_name": selected.name,
                "chainage_km": next_km,
                "chainage_label": format_chainage_label(next_km),
                "chainage_display": format_chainage_display(next_km),
                "latitude": lat,
                "longitude": lon,
            }

    return {
        "project_id": str(project.id),
        "program_code": project.program_code,
        "compliance_mode": project.compliance_mode,
        "inherited_standard": inherited,
        "standard_name": standard.name if standard else None,
        "progress": {
            "tree_count": summary["tree_count"],
            "target_tree_count": summary["target_tree_count"],
            "progress_pct": summary["progress_pct"],
            "work_area_count": summary["work_area_count"],
        },
        "suggested_next": suggested_next,
        "work_areas": [
            {
                "id": str(area.id),
                "name": area.name,
                "geometry_type": area.geometry_type,
                "tree_count": int(
                    (
                        await db.execute(
                            select(func.count()).where(
                                Tree.plantation_id == area.id,
                                Tree.status != "removed",
                            )
                        )
                    ).scalar_one()
                    or 0
                ),
            }
            for area in work_areas
        ],
    }
