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
        "require_pit_photo": True,
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
        "native_species_examples": [
            "Neem",
            "Peepal",
            "Banyan",
            "Jamun",
            "Arjun",
            "Gulmohar",
            "Teak",
            "Karanj",
        ],
    }


def _nagar_van_urban_rules() -> dict[str, Any]:
    return {
        "spacing_m": {"min": 2.5, "warn_below": 2.0},
        "pit_size_cm": {"length": 45, "width": 45, "depth": 45},
        "max_gps_accuracy_m": 10.0,
        "min_photos": 2,
        "guard_type_required": True,
        "layout_pattern": "cluster",
        "allowed_species": None,
        "species_native_pct_min": 80,
        "planting_density_per_ha": {"min": 800, "max": 5000},
        "require_pit_photo": False,
        "chainage_enabled": False,
        "min_trees_project": 10000,
        "work_area_geometry": "polygon",
        "block_types": ["ward_park", "degraded_land", "miyawaki_patch", "avenue_buffer"],
        "native_species_examples": [
            "Neem",
            "Peepal",
            "Banyan",
            "Jamun",
            "Arjun",
            "Gulmohar",
            "Kachnar",
            "Amaltas",
        ],
    }


def _sahakar_van_coop_rules() -> dict[str, Any]:
    return {
        "spacing_m": {"min": 1.0, "warn_below": 0.8},
        "spacing_conventional_m": {"min": 3.0, "warn_below": 2.5},
        "pit_size_cm": {"length": 30, "width": 30, "depth": 30},
        "pit_size_conventional_cm": {"length": 45, "width": 45, "depth": 45},
        "max_gps_accuracy_m": 10.0,
        "min_photos": 2,
        "guard_type_required": True,
        "layout_pattern": "miyawaki_cluster",
        "layout_patterns_allowed": ["miyawaki_cluster", "conventional_row", "mixed"],
        "allowed_species": [
            "Khejri",
            "Prosopis cineraria",
            "Rohida",
            "Tecomella undulata",
            "Neem",
            "Azadirachta indica",
            "Ber",
            "Ziziphus mauritiana",
            "Babool",
            "Acacia nilotica",
            "Palash",
            "Butea monosperma",
            "Arjun",
            "Terminalia arjuna",
        ],
        "species_native_pct_min": 100,
        "planting_density_per_ha": {"min": 2000, "max": 12000},
        "planting_density_conventional_per_ha": {"min": 400, "max": 1200},
        "require_pit_photo": True,
        "chainage_enabled": False,
        "work_area_geometry": "polygon",
        "block_types": [
            "miyawaki_patch",
            "conventional_block",
            "rainwater_harvest",
            "nursery_bed",
            "community_zone",
        ],
        "site_area_acres_min": 1,
        "site_area_acres_reference": 64,
        "rainwater_harvest_required": True,
        "soil_treatment_required": True,
        "organic_manure_required": True,
        "community_participation_min_pct": 50,
        "cooperative_led": True,
        "arid_land_optimized": True,
        "native_species_examples": ["Khejri", "Rohida", "Neem", "Ber", "Babool"],
        "plantation_methods": ["miyawaki", "conventional", "mixed"],
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


def _nutri_garden_rules() -> dict[str, Any]:
    return {
        "spacing_m": {"min": 2.5, "warn_below": 2.0},
        "pit_size_cm": {"length": 30, "width": 30, "depth": 30},
        "max_gps_accuracy_m": 15.0,
        "min_photos": 2,
        "guard_type_required": False,
        "layout_pattern": "cluster",
        "allowed_species": [
            "Guava",
            "Pomegranate",
            "Amla",
            "Jamun",
            "Ber",
            "Mango",
            "Lemon",
            "Karonda",
            "Drumstick",
            "Neem",
        ],
        "species_native_pct_min": 60,
        "planting_density_per_ha": {"min": 400, "max": 2500},
        "require_pit_photo": False,
        "chainage_enabled": False,
        "work_area_geometry": "polygon",
        "site_area_ha": {"min": 0.1, "max": 0.5},
        "min_trees_project": 50,
        "block_types": ["anganwadi_plot", "shg_garden", "panchayat_land", "school_plot"],
        "fruit_medicinal_focus": True,
        "native_species_examples": [
            "Amla",
            "Jamun",
            "Ber",
            "Guava",
            "Pomegranate",
            "Mango",
            "Karonda",
            "Drumstick",
        ],
    }


def _campa_ca_rules() -> dict[str, Any]:
    return {
        "spacing_m": {"min": 3.0, "warn_below": 2.5},
        "pit_size_cm": {"length": 45, "width": 45, "depth": 45},
        "max_gps_accuracy_m": 10.0,
        "min_photos": 3,
        "guard_type_required": True,
        "layout_pattern": "cluster",
        "allowed_species": None,
        "species_native_pct_min": 80,
        "planting_density_per_ha": {"min": 400, "max": 1600},
        "require_pit_photo": True,
        "chainage_enabled": False,
        "work_area_geometry": "polygon",
        "block_types": ["ca_compartment", "degraded_forest", "non_forest_ca", "nursery_bed"],
        "native_species_examples": [
            "Teak",
            "Sal",
            "Bamboo",
            "Neem",
            "Jamun",
            "Arjun",
            "Mahua",
            "Palash",
            "Karanj",
            "Banyan",
        ],
    }


def _gim_restoration_rules() -> dict[str, Any]:
    return {
        **_campa_ca_rules(),
        "work_area_geometry": "polygon",
        "block_types": [
            "degraded_forest",
            "open_forest",
            "scrubland",
            "grassland",
            "nursery_bed",
            "community_zone",
        ],
        "species_native_pct_min": 80,
        "gim_sub_mission_tracking": True,
        "native_species_examples": [
            "Sal",
            "Teak",
            "Bamboo",
            "Mahua",
            "Palash",
            "Jamun",
            "Arjun",
            "Neem",
            "Karanj",
        ],
    }


def _mishti_mangrove_rules() -> dict[str, Any]:
    return {
        "spacing_m": {"min": 2.0, "warn_below": 1.5},
        "pit_size_cm": {"length": 30, "width": 30, "depth": 30},
        "max_gps_accuracy_m": 15.0,
        "min_photos": 3,
        "guard_type_required": False,
        "layout_pattern": "cluster",
        "allowed_species": [
            "Avicennia marina",
            "Rhizophora mucronata",
            "Sonneratia apetala",
            "Bruguiera cylindrica",
            "Ceriops tagal",
            "Aegiceras corniculatum",
        ],
        "species_native_pct_min": 90,
        "planting_density_per_ha": {"min": 1000, "max": 5000},
        "require_pit_photo": True,
        "chainage_enabled": False,
        "work_area_geometry": "polygon",
        "block_types": [
            "mangrove_restoration",
            "coastal_buffer",
            "intertidal_flat",
            "creek_mouth",
            "community_nursery",
        ],
        "coastal_crz_aware": True,
        "saline_tolerant_required": True,
        "native_species_examples": [
            "Avicennia marina",
            "Rhizophora mucronata",
            "Sonneratia apetala",
        ],
    }


def _mgnrega_convergence_rules() -> dict[str, Any]:
    return {
        **_ngo_rules(),
        "work_area_geometry": "polygon",
        "block_types": [
            "farm_boundary",
            "community_land",
            "panchayat_plot",
            "watershed_ridge",
            "farm_forestry_strip",
        ],
        "mgnrega_convergence_required": True,
        "person_days_tracking": True,
        "gram_panchayat_required": True,
        "species_native_pct_min": 70,
        "planting_density_per_ha": {"min": 200, "max": 800},
        "native_species_examples": [
            "Neem",
            "Ber",
            "Babool",
            "Jamun",
            "Mahua",
            "Khejri",
            "Arjun",
        ],
    }


def _jal_shakti_riparian_rules() -> dict[str, Any]:
    return {
        **_ngo_rules(),
        "spacing_m": {"min": 3.0, "warn_below": 2.5},
        "work_area_geometry": "polygon",
        "layout_pattern": "riparian_buffer",
        "block_types": [
            "riverbank_strip",
            "floodplain_buffer",
            "gully_plug",
            "check_dam_catchment",
            "community_nursery",
        ],
        "riparian_buffer_m_min": 30,
        "species_native_pct_min": 75,
        "planting_density_per_ha": {"min": 300, "max": 1200},
        "river_name_required": True,
        "native_species_examples": [
            "Bamboo",
            "Neem",
            "Jamun",
            "Arjun",
            "Karanj",
            "Mahua",
            "Peepal",
        ],
    }


def _dfi_green_corridor_rules() -> dict[str, Any]:
    return {
        **_nhai_rules(),
        "safeguard_profiles": ["world_bank_esf", "undp_ses"],
        "dfi_lender_reporting": True,
        "stakeholder_consultation_required": True,
        "environmental_screening_required": True,
        "min_photos": 3,
        "species_native_pct_min": 80,
        "block_types": [
            "highway_corridor",
            "median_strip",
            "service_road",
            "community_offset",
            "nursery_bed",
        ],
    }


def _mining_reclamation_rules() -> dict[str, Any]:
    return {
        **_industrial_rules(),
        "work_area_geometry": "polygon",
        "block_types": [
            "overburden_dump",
            "pit_wall",
            "buffer_zone",
            "haul_road",
            "tailings_pond",
            "green_belt_strip",
            "void_rehab",
        ],
        "progressive_closure_phases": [
            "phase_i_dump_stabilization",
            "phase_ii_greenbelt",
            "phase_iii_ecorestoration",
            "final_closure",
        ],
        "allowed_species": [
            "Khejri",
            "Neem",
            "Ber",
            "Babool",
            "Jamun",
            "Arjun",
            "Karanj",
            "Mahua",
            "Palash",
            "Rohida",
            "Tecomella undulata",
        ],
        "species_native_pct_min": 80,
        "planting_density_per_ha": {"min": 400, "max": 1200},
        "dump_density_per_ha": {"min": 300, "max": 800},
        "satellite_scan_cadence_days": 30,
        "progressive_closure_tracking": True,
        "ec_green_belt_pct_min": 33.0,
        "native_species_examples": [
            "Khejri",
            "Neem",
            "Ber",
            "Babool",
            "Jamun",
            "Arjun",
            "Karanj",
            "Rohida",
        ],
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


def _estate_monitoring_rules() -> dict[str, Any]:
    return {
        "monitoring_only": True,
        "tree_registration_optional": True,
        "spacing_m": None,
        "pit_size_cm": None,
        "max_gps_accuracy_m": 25.0,
        "min_photos": 0,
        "guard_type_required": False,
        "layout_pattern": "existing_cover",
        "allowed_species": None,
        "species_native_pct_min": None,
        "planting_density_per_ha": None,
        "require_pit_photo": False,
        "chainage_enabled": False,
        "work_area_geometry": "polygon",
        "block_types": [
            "estate_block",
            "compartment",
            "buffer_zone",
            "corridor_strip",
            "watch_tower_radius",
        ],
        "satellite_scan_cadence_days": 30,
        "sar_scan_cadence_days": 30,
        "plot_based_monitoring_recommended": True,
        "max_work_area_ha": 500,
        "min_work_area_ha": 10,
        "recommended_work_area_ha": 100,
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
        "rules": {
            **_industrial_rules(),
            "allowed_species": [
                "Neem",
                "Peepal",
                "Banyan",
                "Jamun",
                "Arjun",
                "Gulmohar",
                "Teak",
                "Karanj",
                "Mahua",
                "Palash",
            ],
        },
    },
    "mining_reclamation_v1": {
        "code": "mining_reclamation_v1",
        "name": "Mining Reclamation — Progressive Closure",
        "segment": "industrial_greenbelt",
        "description": (
            "IBM/MMDR mine lease green belts, overburden dumps, and pit rehab with "
            "progressive closure phases, native stocking targets, and satellite MRV."
        ),
        "compliance_mode": "strict",
        "recommended_program_codes": ["corporate_esg", "government_nhai"],
        "rules": _mining_reclamation_rules(),
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
    "nagar_van_urban_forest_v1": {
        "code": "nagar_van_urban_forest_v1",
        "name": "Nagar Van Urban Forest",
        "segment": "nagar_van_urban",
        "description": (
            "MoEFCC Nagar Van Yojana city-forest blocks with ward polygons, dense cluster "
            "planting, native species emphasis, and 10,000+ tree targets per site."
        ),
        "compliance_mode": "strict",
        "recommended_program_codes": ["government_nhai"],
        "rules": _nagar_van_urban_rules(),
    },
    "sahakar_van_cooperative_v1": {
        "code": "sahakar_van_cooperative_v1",
        "name": "Sahakar Van Cooperative Forest",
        "segment": "sahakar_van_coop",
        "description": (
            "NCCF–Amul cooperative afforestation on arid/degraded land using Miyawaki and "
            "conventional methods, hardy local species, rainwater harvesting, and "
            "community-led maintenance."
        ),
        "compliance_mode": "strict",
        "recommended_program_codes": ["ngo_community", "government_nhai"],
        "rules": _sahakar_van_coop_rules(),
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
    "campa_ca_v1": {
        "code": "campa_ca_v1",
        "name": "CAMPA Compensatory Afforestation",
        "segment": "general",
        "description": (
            "MoEFCC / State CAMPA compensatory afforestation blocks — polygon compartments, "
            "45×45×45 cm pits, 3 m spacing, native species emphasis, and NGT audit evidence."
        ),
        "compliance_mode": "strict",
        "recommended_program_codes": ["government_nhai", "ngo_community"],
        "rules": _campa_ca_rules(),
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
    "estate_monitoring_v1": {
        "code": "estate_monitoring_v1",
        "name": "Estate & Forest Watch",
        "segment": "estate_monitoring",
        "description": (
            "Satellite-first monitoring of existing forest and plantation cover. "
            "No pit/spacing rules — draw 10–500 ha work-area blocks, run monthly NDVI "
            "and SAR integrity scans, optional plot-based ground truth."
        ),
        "compliance_mode": "guided",
        "recommended_program_codes": ["government_nhai", "ngo_community", "corporate_esg"],
        "rules": _estate_monitoring_rules(),
    },
    "amrit_poshan_vatika_v1": {
        "code": "amrit_poshan_vatika_v1",
        "name": "Amrit Poshan Vatika Nutri-Garden",
        "segment": "nutri_garden",
        "description": (
            "Rajasthan state nutri-garden sites on Anganwadi, SHG, and panchayat land "
            "with fruit and medicinal species, 0.1–0.5 ha plots, and MGNREGS convergence."
        ),
        "compliance_mode": "guided",
        "recommended_program_codes": ["government_nhai", "ngo_community"],
        "rules": _nutri_garden_rules(),
    },
    "gim_restoration_v1": {
        "code": "gim_restoration_v1",
        "name": "Green India Mission — Eco Restoration",
        "segment": "general",
        "description": (
            "NAPCC Green India Mission afforestation on degraded forest and non-forest "
            "land with native stocking, compartment polygons, and JFMC convergence."
        ),
        "compliance_mode": "strict",
        "recommended_program_codes": ["government_nhai", "ngo_community"],
        "rules": _gim_restoration_rules(),
    },
    "mishti_mangrove_v1": {
        "code": "mishti_mangrove_v1",
        "name": "MISHTI Mangrove Restoration",
        "segment": "ngo_watershed",
        "description": (
            "Coastal mangrove and shoreline habitat restoration with saline-tolerant "
            "native species, CRZ-aware block layout, and intertidal monitoring."
        ),
        "compliance_mode": "strict",
        "recommended_program_codes": ["government_nhai", "ngo_community"],
        "rules": _mishti_mangrove_rules(),
    },
    "mgnrega_convergence_v1": {
        "code": "mgnrega_convergence_v1",
        "name": "MGNREGA Farm Forestry Convergence",
        "segment": "ngo_watershed",
        "description": (
            "Farm and community forestry converged with MGNREGA wage employment — "
            "gram panchayat linkage, person-day tracking, and flexible cluster layout."
        ),
        "compliance_mode": "guided",
        "recommended_program_codes": ["government_nhai", "ngo_community"],
        "rules": _mgnrega_convergence_rules(),
    },
    "jal_shakti_riparian_v1": {
        "code": "jal_shakti_riparian_v1",
        "name": "Jal Shakti Riparian Plantation",
        "segment": "ngo_watershed",
        "description": (
            "Riverbank and riparian buffer greening along major rivers — minimum buffer "
            "width, native species stocking, and watershed block layout."
        ),
        "compliance_mode": "guided",
        "recommended_program_codes": ["government_nhai", "ngo_community"],
        "rules": _jal_shakti_riparian_rules(),
    },
    "dfi_green_corridor_v1": {
        "code": "dfi_green_corridor_v1",
        "name": "DFI Green Corridor — NHAI / CAMPA",
        "segment": "nhai_highway",
        "description": (
            "Development-finance-backed highway green corridor with NHAI chainage rules, "
            "World Bank ESF and UNDP SES safeguard expectations, and stakeholder consultation."
        ),
        "compliance_mode": "strict",
        "recommended_program_codes": ["government_nhai", "ngo_community"],
        "rules": _dfi_green_corridor_rules(),
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
