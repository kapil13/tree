"""Tests for planting program validation."""

from __future__ import annotations

import pytest

from app.services.planting_programs.validation import (
    ProgramValidationError,
    validate_program_payload,
)


def test_byot_requires_species_and_photo() -> None:
    with pytest.raises(ProgramValidationError) as exc:
        validate_program_payload(
            "byot",
            core_values={"species_text": "", "latitude": 12.9, "longitude": 77.5},
            metadata={},
            photo_count=0,
        )
    assert "missing_required:species_text" in exc.value.errors
    assert "min_photos:1" in exc.value.errors


def test_byot_accepts_minimal_payload() -> None:
    meta = validate_program_payload(
        "byot",
        core_values={
            "species_text": "Neem",
            "latitude": 12.9,
            "longitude": 77.5,
            "planted_at": "2026-07-01",
        },
        metadata={"tree_nickname": "School neem"},
        photo_count=1,
    )
    assert meta["registration_program"] == "byot"
    assert meta["tree_nickname"] == "School neem"


def test_government_requires_permit_fields() -> None:
    with pytest.raises(ProgramValidationError) as exc:
        validate_program_payload(
            "government_nhai",
            core_values={
                "species_text": "Neem",
                "latitude": 12.9,
                "longitude": 77.5,
                "planted_at": "2026-07-01",
            },
            metadata={"project_code": "NH-44"},
            photo_count=3,
        )
    assert any(err.startswith("missing_required:") for err in exc.value.errors)
