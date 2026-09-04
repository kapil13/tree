"""Planting audience codes — routes schemes, presets, and org metadata."""

from __future__ import annotations

from typing import Literal

from app.services.schemes.types import CentralSchemeDefinition

AudienceCode = Literal["mining", "corporate_esg", "government", "international", "general"]

AUDIENCE_CODES: tuple[AudienceCode, ...] = (
    "mining",
    "corporate_esg",
    "government",
    "international",
    "general",
)

AUDIENCE_PROGRAM_CODES: dict[AudienceCode, list[str]] = {
    "mining": ["corporate_esg"],
    "corporate_esg": ["corporate_esg"],
    "government": ["government_nhai", "ngo_community"],
    "international": ["corporate_esg", "government_nhai", "ngo_community"],
    "general": [],
}

# Scheme-level tags for finer filtering within program overlap.
SCHEME_AUDIENCE_TAGS: dict[str, list[AudienceCode]] = {
    "campa_ca": ["government", "international"],
    "gim_restoration": ["government", "international"],
    "mishti_mangrove": ["government", "international"],
    "nagar_van": ["government"],
    "nhai_highway": ["government", "international"],
    "mgnrega_convergence": ["government"],
    "jal_shakti_riparian": ["government", "international"],
    "green_credit_india": ["mining", "corporate_esg", "international"],
    "sahakar_van": ["government", "international"],
    "dfi_green_corridor": ["government", "international"],
    "estate_monitoring": ["mining", "corporate_esg", "government", "international"],
    "raj_amrit_poshan_vatika": ["government"],
}

ORG_TYPE_DEFAULT_AUDIENCE: dict[str, AudienceCode] = {
    "government": "government",
    "corporate": "corporate_esg",
    "ngo": "general",
}


class AudienceError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def normalize_audience(value: str | None) -> AudienceCode:
    if not value:
        return "general"
    code = value.strip().lower()
    if code not in AUDIENCE_CODES:
        raise AudienceError("invalid_audience")
    return code  # type: ignore[return-value]


def scheme_matches_audience(
    scheme: CentralSchemeDefinition,
    audience: AudienceCode | None,
) -> bool:
    if not audience or audience == "general":
        return True
    tags = SCHEME_AUDIENCE_TAGS.get(scheme["code"], [])
    if audience in tags:
        return True
    programs = AUDIENCE_PROGRAM_CODES.get(audience, [])
    if not programs:
        return True
    return any(program in scheme["program_codes"] for program in programs)
