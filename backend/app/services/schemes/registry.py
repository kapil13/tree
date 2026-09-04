"""Central government plantation scheme catalog.

Schemes describe funding/compliance context for planting projects. They are
distinct from planting *programs* (BYOT, government_nhai, etc.) which gate
platform access and enrollment.
"""

from __future__ import annotations

from app.services.schemes.types import CentralSchemeDefinition

SCHEME_REGISTRY: dict[str, CentralSchemeDefinition] = {
    "campa_ca": {
        "code": "campa_ca",
        "label": "CAMPA — Compensatory Afforestation",
        "description": (
            "Compensatory afforestation on forest or non-forest land funded through "
            "State CAMPA under the Compensatory Afforestation Fund Act."
        ),
        "ministry": "MoEFCC",
        "group": "central",
        "program_codes": ["government_nhai", "ngo_community"],
        "default_segment": "general",
        "default_compliance_mode": "strict",
        "default_template_code": "campa_ca_v1",
        "checklist_codes": ["ngt_campa", "fra_tenure"],
        "framework_profiles": ["ngt_campa"],
        "convergence_allowed": ["mgnrega_convergence", "jal_shakti_riparian"],
        "legacy_plantation_category": "forest_ca",
        "kpi_targets": {"survival_pct_min": 70.0, "geo_tagged_pct_min": 95.0},
        "active": True,
        "metadata_sections": [],
    },
    "gim_restoration": {
        "code": "gim_restoration",
        "label": "Green India Mission — Eco Restoration",
        "description": (
            "National Mission for a Green India (NAPCC) afforestation and ecosystem "
            "restoration on degraded forest and non-forest land."
        ),
        "ministry": "MoEFCC",
        "group": "central",
        "program_codes": ["government_nhai", "ngo_community"],
        "default_segment": "general",
        "default_compliance_mode": "strict",
        "default_template_code": None,
        "checklist_codes": ["gim_general"],
        "framework_profiles": ["gim"],
        "convergence_allowed": ["mgnrega_convergence"],
        "legacy_plantation_category": "other_government",
        "kpi_targets": {"survival_pct_min": 70.0, "geo_tagged_pct_min": 90.0},
        "active": True,
        "metadata_sections": [],
    },
    "mishti_mangrove": {
        "code": "mishti_mangrove",
        "label": "MISHTI — Mangrove Restoration",
        "description": (
            "Mangrove Initiative for Shoreline Habitats & Tangible Incomes along "
            "India's coastline."
        ),
        "ministry": "MoEFCC",
        "group": "central",
        "program_codes": ["government_nhai", "ngo_community"],
        "default_segment": "ngo_watershed",
        "default_compliance_mode": "strict",
        "default_template_code": None,
        "checklist_codes": ["mishti_coastal"],
        "framework_profiles": ["mishti"],
        "convergence_allowed": ["mgnrega_convergence"],
        "legacy_plantation_category": None,
        "kpi_targets": {"survival_pct_min": 65.0, "geo_tagged_pct_min": 90.0},
        "active": True,
        "metadata_sections": [],
    },
    "nagar_van": {
        "code": "nagar_van",
        "label": "Nagar Van Yojana — Urban Forest",
        "description": "Urban forestry and city-forest blocks under Nagar Van Yojana.",
        "ministry": "MoEFCC",
        "group": "central",
        "program_codes": ["government_nhai"],
        "default_segment": "nagar_van_urban",
        "default_compliance_mode": "strict",
        "default_template_code": "nagar_van_urban_forest_v1",
        "checklist_codes": ["nagar_van_urban", "fra_tenure"],
        "framework_profiles": ["nagar_van"],
        "convergence_allowed": [],
        "legacy_plantation_category": "municipal",
        "kpi_targets": {"survival_pct_min": 75.0, "geo_tagged_pct_min": 95.0, "min_trees": 10000},
        "active": True,
        "metadata_sections": [],
    },
    "nhai_highway": {
        "code": "nhai_highway",
        "label": "NHAI — Green Highway Plantation",
        "description": (
            "Linear highway and expressway plantation with chainage-based audits "
            "along national and state highway corridors."
        ),
        "ministry": "MoRTH / NHAI",
        "group": "central",
        "program_codes": ["government_nhai"],
        "default_segment": "nhai_highway",
        "default_compliance_mode": "strict",
        "default_template_code": "nhai_highway_v1",
        "checklist_codes": ["ngt_campa"],
        "framework_profiles": ["ngt_campa"],
        "convergence_allowed": ["mgnrega_convergence"],
        "legacy_plantation_category": "highway",
        "kpi_targets": {"survival_pct_min": 80.0, "geo_tagged_pct_min": 98.0},
        "active": True,
        "metadata_sections": [],
    },
    "mgnrega_convergence": {
        "code": "mgnrega_convergence",
        "label": "MGNREGA — Farm Forestry Convergence",
        "description": (
            "Tree plantation converged with MGNREGA wage employment on farm and "
            "community lands. Often paired with CAMPA or GIM projects."
        ),
        "ministry": "Rural Development",
        "group": "convergence",
        "program_codes": ["government_nhai", "ngo_community"],
        "default_segment": "ngo_watershed",
        "default_compliance_mode": "guided",
        "default_template_code": None,
        "checklist_codes": ["mgnrega_convergence", "fra_tenure"],
        "framework_profiles": ["esg_general"],
        "convergence_allowed": [],
        "legacy_plantation_category": None,
        "kpi_targets": {"survival_pct_min": 60.0, "geo_tagged_pct_min": 85.0},
        "active": True,
        "metadata_sections": [],
    },
    "jal_shakti_riparian": {
        "code": "jal_shakti_riparian",
        "label": "Jal Shakti — Riverbank Plantation",
        "description": (
            "Riparian and river-bank greening along major rivers under Jal Shakti "
            "and river rejuvenation programmes."
        ),
        "ministry": "Jal Shakti",
        "group": "central",
        "program_codes": ["government_nhai", "ngo_community"],
        "default_segment": "ngo_watershed",
        "default_compliance_mode": "guided",
        "default_template_code": None,
        "checklist_codes": ["esg_general"],
        "framework_profiles": ["esg_general"],
        "convergence_allowed": ["mgnrega_convergence"],
        "legacy_plantation_category": None,
        "kpi_targets": {"survival_pct_min": 70.0, "geo_tagged_pct_min": 90.0},
        "active": True,
        "metadata_sections": [],
    },
    "green_credit_india": {
        "code": "green_credit_india",
        "label": "MoEFCC Green Credit Programme",
        "description": (
            "Voluntary plantation on degraded land registered under India's Green "
            "Credit Rules for tradable green credits."
        ),
        "ministry": "MoEFCC",
        "group": "corporate",
        "program_codes": ["corporate_esg", "government_nhai"],
        "default_segment": "industrial_greenbelt",
        "default_compliance_mode": "strict",
        "default_template_code": None,
        "checklist_codes": ["green_credit_india"],
        "framework_profiles": ["green_credit_india"],
        "convergence_allowed": [],
        "legacy_plantation_category": None,
        "kpi_targets": {"survival_pct_min": 75.0, "geo_tagged_pct_min": 95.0},
        "active": True,
        "metadata_sections": [],
    },
    "sahakar_van": {
        "code": "sahakar_van",
        "label": "Sahakar Van — Cooperative Afforestation",
        "description": (
            "Cooperative-sector afforestation and environmental restoration led by "
            "NCCF and Amul under the Ministry of Cooperation — Miyawaki and conventional "
            "planting with community participation on arid land."
        ),
        "ministry": "Ministry of Cooperation",
        "group": "cooperative",
        "program_codes": ["ngo_community", "government_nhai"],
        "default_segment": "sahakar_van_coop",
        "default_compliance_mode": "strict",
        "default_template_code": "sahakar_van_cooperative_v1",
        "checklist_codes": ["sahakar_van_coop", "fra_tenure"],
        "framework_profiles": ["sahakar_van"],
        "convergence_allowed": ["mgnrega_convergence"],
        "legacy_plantation_category": None,
        "kpi_targets": {"survival_pct_min": 70.0, "geo_tagged_pct_min": 90.0},
        "active": True,
        "metadata_sections": [],
    },
    "dfi_green_corridor": {
        "code": "dfi_green_corridor",
        "label": "DFI Green Corridor — NHAI / CAMPA Convergence",
        "description": (
            "Development-finance-backed green corridor with World Bank ESF and UNDP SES "
            "safeguard expectations alongside NHAI and CAMPA compliance."
        ),
        "ministry": "MoRTH / MoEFCC",
        "group": "central",
        "program_codes": ["government_nhai", "ngo_community"],
        "default_segment": "nhai_highway",
        "default_compliance_mode": "strict",
        "default_template_code": "dfi_green_corridor_v1",
        "checklist_codes": ["world_bank_esf", "undp_ses", "ngt_campa", "fra_tenure"],
        "framework_profiles": ["ngt_campa", "esg_general"],
        "convergence_allowed": ["campa_ca", "mgnrega_convergence"],
        "legacy_plantation_category": "highway",
        "kpi_targets": {"survival_pct_min": 80.0, "geo_tagged_pct_min": 98.0},
        "active": True,
        "metadata_sections": [],
    },
    "estate_monitoring": {
        "code": "estate_monitoring",
        "label": "Estate & Forest Watch — Existing Cover",
        "description": (
            "Satellite and AI monitoring of existing forest, plantation, or urban green "
            "estates without mandatory tree census. Draw work-area boundaries, run NDVI "
            "and SAR integrity scans, and track health alerts over 5–20 year watch programmes."
        ),
        "ministry": "MoEFCC / State Forest",
        "group": "central",
        "program_codes": ["government_nhai", "ngo_community", "corporate_esg"],
        "default_segment": "estate_monitoring",
        "default_compliance_mode": "guided",
        "default_template_code": "estate_monitoring_v1",
        "checklist_codes": ["estate_monitoring"],
        "framework_profiles": ["esg_general"],
        "convergence_allowed": ["campa_ca", "nagar_van", "gim_restoration"],
        "legacy_plantation_category": None,
        "kpi_targets": {
            "scan_coverage_pct_min": 80.0,
            "max_days_since_scan": 35,
        },
        "active": True,
        "metadata_sections": [],
    },
}

PROGRAMS_REQUIRING_SCHEME = frozenset({"government_nhai", "ngo_community"})


def _hydrate_registry() -> None:
    from app.services.schemes.metadata_fields import metadata_sections_for_scheme

    for code, scheme in SCHEME_REGISTRY.items():
        scheme["metadata_sections"] = metadata_sections_for_scheme(code)


_hydrate_registry()


def scheme_codes() -> list[str]:
    return sorted(SCHEME_REGISTRY.keys())


def get_scheme(code: str) -> CentralSchemeDefinition | None:
    return SCHEME_REGISTRY.get(code)


def list_schemes(
    *,
    program_code: str | None = None,
    audience: str | None = None,
    active_only: bool = True,
) -> list[CentralSchemeDefinition]:
    from app.services.onboarding.audience import normalize_audience, scheme_matches_audience

    items = list(SCHEME_REGISTRY.values())
    if active_only:
        items = [s for s in items if s["active"]]
    if program_code:
        items = [s for s in items if program_code in s["program_codes"]]
    if audience:
        resolved = normalize_audience(audience)
        items = [s for s in items if scheme_matches_audience(s, resolved)]
    return sorted(items, key=lambda s: (s["group"], s["label"]))
