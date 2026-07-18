"""Planting standard templates — segment-specific defaults (NHAI, mines, societies, NGO)."""

from __future__ import annotations

from typing import Any, TypedDict


class StandardTemplate(TypedDict):
    code: str
    name: str
    segment: str
    description: str
    compliance_mode: str
    recommended_program_codes: list[str]
    rules: dict[str, Any]


def _nhai_rules() -> dict[str, Any]:
    return {
        "spacing_m": {"min": 6.0, "warn_below": 5.5},
        "pit_size_cm": {"length": 60, "width": 60, "depth": 60},
        "max_gps_accuracy_m": 10.0,
        "min_photos": 3,
        "guard_type_required": True,
        "layout_pattern": "single_row",
        "allowed_species": None,
        "species_native_pct_min": None,
        "planting_density_per_ha": None,
        "require_pit_photo": False,
        "chainage_enabled": True,
    }


def _industrial_rules() -> dict[str, Any]:
    return {
        "spacing_m": {"min": 3.0, "warn_below": 2.5},
        "pit_size_cm": {"length": 45, "width": 45, "depth": 45},
        "max_gps_accuracy_m": 15.0,
        "min_photos": 2,
        "guard_type_required": False,
        "layout_pattern": "grid",
        "allowed_species": None,
        "species_native_pct_min": 70,
        "planting_density_per_ha": {"min": 400, "max": 1200},
        "require_pit_photo": False,
        "chainage_enabled": False,
    }


def _township_rules() -> dict[str, Any]:
    return {
        "spacing_m": {"min": 5.0, "warn_below": 4.5},
        "pit_size_cm": {"length": 60, "width": 60, "depth": 60},
        "max_gps_accuracy_m": 10.0,
        "min_photos": 2,
        "guard_type_required": True,
        "layout_pattern": "avenue",
        "allowed_species": None,
        "species_native_pct_min": None,
        "planting_density_per_ha": {"min": 200, "max": 800},
        "require_pit_photo": False,
        "chainage_enabled": False,
    }


def _ngo_rules() -> dict[str, Any]:
    return {
        "spacing_m": {"min": 4.0, "warn_below": 3.5},
        "pit_size_cm": {"length": 45, "width": 45, "depth": 45},
        "max_gps_accuracy_m": 20.0,
        "min_photos": 2,
        "guard_type_required": False,
        "layout_pattern": "cluster",
        "allowed_species": None,
        "species_native_pct_min": None,
        "planting_density_per_ha": None,
        "require_pit_photo": False,
        "chainage_enabled": False,
    }


def _open_rules() -> dict[str, Any]:
    return {
        "spacing_m": None,
        "pit_size_cm": None,
        "max_gps_accuracy_m": 50.0,
        "min_photos": 1,
        "guard_type_required": False,
        "layout_pattern": "free",
        "allowed_species": None,
        "species_native_pct_min": None,
        "planting_density_per_ha": None,
        "require_pit_photo": False,
        "chainage_enabled": False,
    }


STANDARD_TEMPLATES: dict[str, StandardTemplate] = {
    "nhai_highway_v1": {
        "code": "nhai_highway_v1",
        "name": "NHAI Highway Plantation",
        "segment": "nhai_highway",
        "description": "Highway ROW corridor planting with chainage, pit 60×60×60 cm, 6 m spacing.",
        "compliance_mode": "strict",
        "recommended_program_codes": ["government_nhai"],
        "rules": _nhai_rules(),
    },
    "industrial_greenbelt_v1": {
        "code": "industrial_greenbelt_v1",
        "name": "Industrial Green Belt",
        "segment": "industrial_greenbelt",
        "description": "Mine, cement, and factory green belts with native species targets and grid density.",
        "compliance_mode": "strict",
        "recommended_program_codes": ["corporate_esg"],
        "rules": _industrial_rules(),
    },
    "township_landscape_v1": {
        "code": "township_landscape_v1",
        "name": "Township Landscape",
        "segment": "township_landscape",
        "description": "Large society and township avenue planting with approved spacing.",
        "compliance_mode": "guided",
        "recommended_program_codes": ["corporate_esg", "government_nhai"],
        "rules": _township_rules(),
    },
    "ngo_watershed_v1": {
        "code": "ngo_watershed_v1",
        "name": "NGO Watershed Plot",
        "segment": "ngo_watershed",
        "description": "Community and watershed restoration with flexible cluster layout.",
        "compliance_mode": "guided",
        "recommended_program_codes": ["ngo_community"],
        "rules": _ngo_rules(),
    },
    "open_byot_v1": {
        "code": "open_byot_v1",
        "name": "Open BYOT",
        "segment": "general",
        "description": "Casual citizen tagging without strict boundary enforcement.",
        "compliance_mode": "open",
        "recommended_program_codes": ["byot"],
        "rules": _open_rules(),
    },
}


def list_templates(*, segment: str | None = None) -> list[StandardTemplate]:
    items = list(STANDARD_TEMPLATES.values())
    if segment:
        items = [t for t in items if t["segment"] == segment]
    return items


def get_template(code: str) -> StandardTemplate | None:
    return STANDARD_TEMPLATES.get(code)


def template_for_segment(segment: str) -> StandardTemplate:
    for tpl in STANDARD_TEMPLATES.values():
        if tpl["segment"] == segment:
            return tpl
    return STANDARD_TEMPLATES["open_byot_v1"]
