"""GPS and photo integrity checks for field visits (Wave B / P3)."""

from __future__ import annotations

from typing import Any


def check_photo_integrity(photo_keys: list[str]) -> tuple[bool, dict[str, Any]]:
    """Reject duplicate or empty photo keys."""
    cleaned = [k.strip() for k in photo_keys if k and k.strip()]
    unique = list(dict.fromkeys(cleaned))
    passed = len(unique) == len(cleaned) and len(unique) > 0
    return passed, {
        "photo_count": len(unique),
        "duplicate_photo_keys": len(cleaned) - len(unique),
    }


def check_gps_integrity(
    *,
    inside_boundary: bool | None,
    location_warnings: list[str],
) -> tuple[bool, dict[str, Any]]:
    """Hard-fail when verifier GPS is outside the block boundary."""
    passed = inside_boundary is not False
    return passed, {
        "inside_boundary": inside_boundary,
        "location_warnings": location_warnings,
    }
