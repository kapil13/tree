"""Compliance framework profiles for mapped report exports."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

FrameworkProfileCode = Literal[
    "ipcc_ar6",
    "verra_vm0047",
    "gold_standard_luf",
    "redd_plus",
    "paris_ndc",
    "ngt_campa",
    "esg_general",
]

MethodologyCode = Literal["IPCC_AR6", "VERRA_VM0047", "GOLD_STANDARD_LUF", "NONE"]


@dataclass(frozen=True)
class FrameworkProfile:
    code: FrameworkProfileCode
    title: str
    short_label: str
    methodology: MethodologyCode
    description: str
    disclaimer: str
    reference: str


DISCLAIMER = (
    "Prepared for audit and third-party review. This report does not constitute "
    "certification, legal compliance, carbon credit issuance, or treaty adherence."
)

FRAMEWORK_PROFILES: dict[FrameworkProfileCode, FrameworkProfile] = {
    "ipcc_ar6": FrameworkProfile(
        code="ipcc_ar6",
        title="IPCC AR6 — GHG Inventory Support",
        short_label="IPCC AR6",
        methodology="IPCC_AR6",
        description="Biomass and carbon estimates aligned with IPCC AR6 Volume 4 guidance.",
        disclaimer=DISCLAIMER,
        reference="IPCC 2019 Refinement / AR6 Vol.4 Ch.4",
    ),
    "verra_vm0047": FrameworkProfile(
        code="verra_vm0047",
        title="Verra VM0047 — Afforestation, Reforestation & Revegetation",
        short_label="Verra VM0047",
        methodology="VERRA_VM0047",
        description="ARR project monitoring data with 20% permanence buffer and strata summary.",
        disclaimer=DISCLAIMER,
        reference="Verra VM0047 v1.0",
    ),
    "gold_standard_luf": FrameworkProfile(
        code="gold_standard_luf",
        title="Gold Standard — Land Use & Forests",
        short_label="Gold Standard LUF",
        methodology="GOLD_STANDARD_LUF",
        description="Carbon and co-benefit evidence for Gold Standard LUF verification.",
        disclaimer=DISCLAIMER,
        reference="Gold Standard LUF Requirements",
    ),
    "redd_plus": FrameworkProfile(
        code="redd_plus",
        title="REDD+ — Forest Carbon MRV Evidence",
        short_label="REDD+",
        methodology="IPCC_AR6",
        description="Baseline, permanence, and leakage evidence structures for REDD+ programs.",
        disclaimer=DISCLAIMER,
        reference="UNFCCC REDD+ Warsaw Framework / IPCC GPG",
    ),
    "paris_ndc": FrameworkProfile(
        code="paris_ndc",
        title="Paris Agreement — NDC Traceability",
        short_label="Paris / NDC",
        methodology="IPCC_AR6",
        description="Geo-tagged planting ledger supporting national commitments and Article 6 transparency.",
        disclaimer=DISCLAIMER,
        reference="Paris Agreement Art. 4 (NDCs) / Art. 6 (cooperative approaches)",
    ),
    "ngt_campa": FrameworkProfile(
        code="ngt_campa",
        title="India — NGT / CAMPA / FCA Compensatory Afforestation",
        short_label="NGT / CAMPA",
        methodology="NONE",
        description="Timestamped planting proof, survival status, and compliance violations for judicial and forest-dept audits.",
        disclaimer=DISCLAIMER,
        reference="FCA 1980 / CAMPA Act 2016 / NGT monitoring orders",
    ),
    "esg_general": FrameworkProfile(
        code="esg_general",
        title="ESG & Sustainability Disclosure",
        short_label="ESG",
        methodology="IPCC_AR6",
        description="Combined planting, carbon, and compliance metrics for corporate ESG reporting.",
        disclaimer=DISCLAIMER,
        reference="GRI / TCFD / CSRD-aligned evidence (non-certified)",
    ),
}


def list_framework_profiles() -> list[dict]:
    return [
        {
            "code": p.code,
            "title": p.title,
            "short_label": p.short_label,
            "methodology": p.methodology,
            "description": p.description,
            "reference": p.reference,
        }
        for p in FRAMEWORK_PROFILES.values()
    ]


def get_framework_profile(code: str) -> FrameworkProfile | None:
    return FRAMEWORK_PROFILES.get(code)  # type: ignore[arg-type]
