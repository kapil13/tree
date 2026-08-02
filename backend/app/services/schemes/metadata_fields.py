"""Scheme-specific metadata field definitions (govt reference IDs)."""

from __future__ import annotations

from typing import Any

# Reuse planting program form field shape for API/UI parity.
FormField = dict[str, Any]

_COMMON_APO_FIELDS: list[FormField] = [
    {
        "key": "apo_financial_year",
        "label": "APO financial year",
        "type": "text",
        "required": True,
        "placeholder": "2025-26",
        "help_text": "State CAMPA Annual Plan of Operation financial year.",
    },
    {
        "key": "state_name",
        "label": "State / UT",
        "type": "text",
        "required": True,
        "placeholder": "Rajasthan",
    },
]

SCHEME_METADATA_FIELDS: dict[str, list[FormField]] = {
    "campa_ca": [
        {
            "key": "pca_number",
            "label": "PCA / CA proposal number",
            "type": "text",
            "required": True,
            "placeholder": "PCA/RAJ/2025/1842",
            "help_text": "Compensatory afforestation proposal reference under FC Act.",
        },
        {
            "key": "forest_diversion_id",
            "label": "Forest diversion / FC reference",
            "type": "text",
            "required": True,
            "placeholder": "FC-8821-2024",
            "help_text": "Forest Conservation Act diversion approval ID.",
        },
        {
            "key": "state_campa_account",
            "label": "State CAMPA account",
            "type": "text",
            "required": False,
            "placeholder": "Rajasthan State CAMPA",
        },
        *_COMMON_APO_FIELDS,
        {
            "key": "ca_land_parcel_id",
            "label": "CA land parcel / block ID",
            "type": "text",
            "required": False,
            "help_text": "GIS or forest department parcel identifier for CA land.",
        },
        {
            "key": "ngt_case_number",
            "label": "NGT case number (if applicable)",
            "type": "text",
            "required": False,
        },
    ],
    "gim_restoration": [
        {
            "key": "gim_sub_mission",
            "label": "GIM sub-mission",
            "type": "select",
            "required": True,
            "options": [
                {"value": "SM-1", "label": "SM-1 — Forest quality"},
                {"value": "SM-2", "label": "SM-2 — Eco restoration"},
                {"value": "SM-3", "label": "SM-3 — Urban tree cover"},
                {"value": "SM-4", "label": "SM-4 — Agro-forestry"},
            ],
        },
        {
            "key": "state_annual_plan_ref",
            "label": "State annual plan reference",
            "type": "text",
            "required": True,
        },
        *_COMMON_APO_FIELDS,
        {
            "key": "jfmc_name",
            "label": "JFMC / village committee",
            "type": "text",
            "required": False,
            "help_text": "Joint Forest Management Committee when applicable.",
        },
    ],
    "mishti_mangrove": [
        {
            "key": "mishti_project_id",
            "label": "MISHTI project ID",
            "type": "text",
            "required": True,
        },
        {
            "key": "coastal_state",
            "label": "Coastal state / UT",
            "type": "text",
            "required": True,
        },
        {
            "key": "coastal_district",
            "label": "Coastal district",
            "type": "text",
            "required": True,
        },
        {
            "key": "crz_category",
            "label": "CRZ category",
            "type": "select",
            "required": True,
            "options": [
                {"value": "CRZ-I", "label": "CRZ-I — Ecologically sensitive"},
                {"value": "CRZ-II", "label": "CRZ-II — Developed"},
                {"value": "CRZ-III", "label": "CRZ-III — Undeveloped"},
                {"value": "CRZ-IV", "label": "CRZ-IV — Water body"},
            ],
        },
        {
            "key": "restoration_area_ha",
            "label": "Restoration area (hectares)",
            "type": "number",
            "required": True,
            "min": 0.01,
        },
    ],
    "nagar_van": [
        {
            "key": "nagar_van_project_id",
            "label": "Nagar Van project ID",
            "type": "text",
            "required": True,
        },
        {
            "key": "ulb_name",
            "label": "ULB / municipal body",
            "type": "text",
            "required": True,
        },
        {
            "key": "urban_forest_name",
            "label": "Urban forest / park name",
            "type": "text",
            "required": True,
        },
        {
            "key": "target_trees",
            "label": "Scheme target trees",
            "type": "number",
            "required": False,
            "min": 1,
            "help_text": "Nagar Van Yojana typically targets 10,000+ trees per site.",
        },
    ],
    "nhai_highway": [
        {
            "key": "nhai_package_code",
            "label": "NHAI package / contract code",
            "type": "text",
            "required": True,
            "placeholder": "NH-44-PKG-3",
        },
        {
            "key": "highway_number",
            "label": "Highway number",
            "type": "text",
            "required": True,
            "placeholder": "NH-44",
        },
        {
            "key": "dpr_milestone",
            "label": "DPR / BOQ milestone",
            "type": "text",
            "required": False,
        },
        {
            "key": "chainage_start_km",
            "label": "Chainage start (km)",
            "type": "number",
            "required": False,
            "min": 0,
        },
        {
            "key": "chainage_end_km",
            "label": "Chainage end (km)",
            "type": "number",
            "required": False,
            "min": 0,
        },
    ],
    "mgnrega_convergence": [
        {
            "key": "mgnrega_work_estimate_id",
            "label": "MGNREGA work estimate ID",
            "type": "text",
            "required": True,
        },
        {
            "key": "gram_panchayat",
            "label": "Gram panchayat",
            "type": "text",
            "required": True,
        },
        {
            "key": "person_days_planned",
            "label": "Person-days planned",
            "type": "number",
            "required": True,
            "min": 1,
        },
        {
            "key": "financial_year",
            "label": "Financial year",
            "type": "text",
            "required": True,
            "placeholder": "2025-26",
        },
    ],
    "jal_shakti_riparian": [
        {
            "key": "river_name",
            "label": "River / tributary",
            "type": "text",
            "required": True,
        },
        {
            "key": "buffer_km",
            "label": "Riparian buffer (km each side)",
            "type": "number",
            "required": True,
            "min": 0.1,
            "max": 10,
        },
        {
            "key": "jal_shakti_scheme_ref",
            "label": "Jal Shakti / NMCG scheme reference",
            "type": "text",
            "required": False,
        },
    ],
    "green_credit_india": [
        {
            "key": "green_credit_land_bank_id",
            "label": "Green Credit land bank ID",
            "type": "text",
            "required": True,
            "help_text": "MoEFCC Green Credit Programme land bank registration.",
        },
        {
            "key": "gcp_activity_type",
            "label": "GCP activity type",
            "type": "select",
            "required": True,
            "options": [
                {"value": "tree_plantation", "label": "Tree plantation"},
                {"value": "eco_restoration", "label": "Eco restoration"},
            ],
        },
        {
            "key": "verifier_reference",
            "label": "Verifier / ICFRE reference",
            "type": "text",
            "required": False,
        },
    ],
    "sahakar_van": [
        {
            "key": "sahakar_van_project_id",
            "label": "Sahakar Van project ID",
            "type": "text",
            "required": True,
            "placeholder": "SV-NCCF-RAJ-2026-01",
            "help_text": "NCCF / Ministry of Cooperation project reference.",
        },
        {
            "key": "nccf_project_ref",
            "label": "NCCF project reference",
            "type": "text",
            "required": True,
            "placeholder": "NCCF/SV/2026/SUMEL",
        },
        {
            "key": "amul_union_name",
            "label": "Amul dairy union / federation",
            "type": "text",
            "required": True,
            "placeholder": "Amul — Gujarat Cooperative Milk Marketing Federation",
        },
        {
            "key": "cooperative_society_name",
            "label": "Primary cooperative society",
            "type": "text",
            "required": True,
            "help_text": "Implementing cooperative society or women's group.",
        },
        {
            "key": "village_name",
            "label": "Village / site name",
            "type": "text",
            "required": True,
            "placeholder": "Sumel",
        },
        {
            "key": "district",
            "label": "District",
            "type": "text",
            "required": True,
            "placeholder": "Jaipur",
        },
        {
            "key": "state_name",
            "label": "State / UT",
            "type": "text",
            "required": True,
            "placeholder": "Rajasthan",
        },
        {
            "key": "site_area_acres",
            "label": "Site area (acres)",
            "type": "number",
            "required": True,
            "min": 1,
            "help_text": "Pilot sites are typically 10–64 acres of arid or degraded land.",
        },
        {
            "key": "plantation_method",
            "label": "Plantation method",
            "type": "select",
            "required": True,
            "options": [
                {"value": "mixed", "label": "Mixed — Miyawaki + conventional"},
                {"value": "miyawaki", "label": "Miyawaki dense forest"},
                {"value": "conventional", "label": "Conventional row planting"},
            ],
        },
        {
            "key": "local_partner_agency",
            "label": "Local partner agency (optional)",
            "type": "text",
            "required": False,
            "help_text": "e.g. Jaipur Development Authority, district forest office.",
        },
        {
            "key": "target_trees",
            "label": "Target trees",
            "type": "number",
            "required": False,
            "min": 1,
            "help_text": "Total saplings planned for the cooperative forest site.",
        },
    ],
}


def metadata_sections_for_scheme(scheme_code: str) -> list[dict[str, Any]]:
    fields = SCHEME_METADATA_FIELDS.get(scheme_code, [])
    if not fields:
        return []
    return [
        {
            "id": "scheme_refs",
            "title": "Scheme references",
            "description": "Government scheme identifiers required for audit and fund convergence.",
            "fields": fields,
        }
    ]
