"""Audience preset catalog for onboarding and scheme routing."""

from __future__ import annotations

from typing import Any, TypedDict

from app.services.onboarding.audience import AUDIENCE_CODES, AudienceCode


class AudiencePreset(TypedDict):
    code: AudienceCode
    label: str
    description: str
    recommended_program_code: str
    recommended_scheme_codes: list[str]
    recommended_template_code: str | None
    recommended_segment: str
    checklist_codes: list[str]
    dashboard_highlights: list[str]


AUDIENCE_PRESETS: dict[AudienceCode, AudiencePreset] = {
    "mining": {
        "code": "mining",
        "label": "Mining & industrial reclamation",
        "description": (
            "Mine green belts, overburden dumps, cement and factory buffers with "
            "native species targets, progressive closure tracking, and satellite MRV."
        ),
        "recommended_program_code": "corporate_esg",
        "recommended_scheme_codes": [
            "mining_reclamation",
            "green_credit_india",
            "estate_monitoring",
        ],
        "recommended_template_code": "mining_reclamation_v1",
        "recommended_segment": "industrial_greenbelt",
        "checklist_codes": ["mining_reclamation", "esg_general"],
        "dashboard_highlights": ["greenbelt", "closure", "satellite"],
    },
    "corporate_esg": {
        "code": "corporate_esg",
        "label": "Corporate ESG & listed companies",
        "description": (
            "CSR plantations, SEBI BRSR Principle 6 evidence, supplier geo MRV, "
            "and board-ready sustainability exports."
        ),
        "recommended_program_code": "corporate_esg",
        "recommended_scheme_codes": ["green_credit_india", "estate_monitoring"],
        "recommended_template_code": "industrial_greenbelt_v1",
        "recommended_segment": "industrial_greenbelt",
        "checklist_codes": ["esg_general"],
        "dashboard_highlights": ["brsr", "portfolio", "exports"],
    },
    "government": {
        "code": "government",
        "label": "Government & public sector",
        "description": (
            "CAMPA, NHAI, Nagar Van, MGNREGS convergence, and state scheme "
            "plantation with district-level rollups and govt reference IDs."
        ),
        "recommended_program_code": "government_nhai",
        "recommended_scheme_codes": [
            "campa_ca",
            "nhai_highway",
            "nagar_van",
            "raj_amrit_poshan_vatika",
            "mgnrega_convergence",
        ],
        "recommended_template_code": "campa_ca_v1",
        "recommended_segment": "general",
        "checklist_codes": ["ngt_campa", "fra_tenure"],
        "dashboard_highlights": ["schemes", "survival", "geo_tag"],
    },
    "international": {
        "code": "international",
        "label": "International carbon & standards",
        "description": (
            "VM0047, Gold Standard, TNFD, REDD+, and DFI safeguard programmes "
            "with audit-grade evidence bundles for VVB review."
        ),
        "recommended_program_code": "corporate_esg",
        "recommended_scheme_codes": [
            "green_credit_india",
            "dfi_green_corridor",
            "estate_monitoring",
        ],
        "recommended_template_code": None,
        "recommended_segment": "general",
        "checklist_codes": ["vm0047", "world_bank_esf"],
        "dashboard_highlights": ["credits", "evidence", "compliance"],
    },
    "general": {
        "code": "general",
        "label": "General plantation",
        "description": (
            "Flexible planting without a specific sector focus. All central schemes "
            "remain available when creating projects."
        ),
        "recommended_program_code": "byot",
        "recommended_scheme_codes": [],
        "recommended_template_code": None,
        "recommended_segment": "general",
        "checklist_codes": ["esg_general"],
        "dashboard_highlights": ["trees", "map", "reports"],
    },
}


def list_audience_presets() -> list[AudiencePreset]:
    return [AUDIENCE_PRESETS[code] for code in AUDIENCE_CODES]


def get_audience_preset(code: str) -> AudiencePreset | None:
    try:
        normalized = code.strip().lower()
    except AttributeError:
        return None
    return AUDIENCE_PRESETS.get(normalized)  # type: ignore[arg-type]


def preset_to_dict(preset: AudiencePreset) -> dict[str, Any]:
    return dict(preset)
