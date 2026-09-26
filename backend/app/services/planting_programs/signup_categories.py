"""Signup category → planting program mapping for professional onboarding."""

from __future__ import annotations

SIGNUP_CATEGORY_BYOT = "byot"
PROFESSIONAL_SIGNUP_CATEGORIES = frozenset(
    {"government_nhai", "corporate_esg", "ngo_community"}
)
SIGNUP_CATEGORIES = frozenset({SIGNUP_CATEGORY_BYOT, *PROFESSIONAL_SIGNUP_CATEGORIES})

# Legacy / shorthand aliases from UI labels
_SIGNUP_CATEGORY_ALIASES: dict[str, str] = {
    "government": "government_nhai",
    "corporate": "corporate_esg",
    "ngo": "ngo_community",
    "ngo_watershed": "ngo_community",
}


def normalize_signup_category(category: str | None) -> str:
    raw = (category or SIGNUP_CATEGORY_BYOT).strip().lower()
    return _SIGNUP_CATEGORY_ALIASES.get(raw, raw)


def program_code_for_signup_category(category: str | None) -> str | None:
    normalized = normalize_signup_category(category)
    if normalized == SIGNUP_CATEGORY_BYOT:
        return None
    if normalized not in PROFESSIONAL_SIGNUP_CATEGORIES:
        raise ValueError("invalid_signup_category")
    return normalized


def is_professional_signup_category(category: str | None) -> bool:
    try:
        return program_code_for_signup_category(category) is not None
    except ValueError:
        return False
