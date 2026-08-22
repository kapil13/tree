"""Tests for project tree metadata merge during registration."""

from __future__ import annotations

import pytest

from app.services.planting_programs.validation import (
    ProgramValidationError,
    validate_program_payload,
)
from app.services.planting_projects.registration_context import merge_project_into_tree_metadata


def test_merge_project_uses_stored_tree_registration_defaults() -> None:
    class FakeProject:
        code = "CAMPA-DEMO"
        name = "Demo Site"
        scheme_code = "campa_ca"
        metadata_ = {
            "scheme_refs": {},
            "tree_registration_defaults": {
                "permit_reference": "PCA/STORED/1",
                "site_zone": "Stored Block",
                "implementing_agency": "Stored Agency",
                "maintenance_responsible": "Stored Maintenance",
                "legal_basis": "compensatory_afforestation",
                "land_category": "forest",
            },
        }

    rules = {
        "pit_size_cm": {"length": 45, "width": 45, "depth": 45},
        "spacing_m": {"min": 3},
        "guard_type_required": True,
        "species_native_pct_min": 80,
    }
    merged = merge_project_into_tree_metadata(
        {},
        project=FakeProject(),  # type: ignore[arg-type]
        rules=rules,
        surveyor_name="Asha Verma",
    )
    assert merged["permit_reference"] == "PCA/STORED/1"
    assert merged["site_zone"] == "Stored Block"
    assert merged["implementing_agency"] == "Stored Agency"
    assert merged["maintenance_responsible"] == "Stored Maintenance"

    meta = validate_program_payload(
        "government_nhai",
        core_values={
            "species_text": "Khejri",
            "latitude": 26.9,
            "longitude": 75.7,
            "planted_at": "2026-07-01",
        },
        metadata=merged,
        photo_count=3,
    )
    assert meta["permit_reference"] == "PCA/STORED/1"


def test_merge_project_fills_campa_and_compliance_defaults() -> None:
    class FakeProject:
        code = "CAMPA-DEMO"
        scheme_code = "campa_ca"
        metadata_ = {
            "scheme_refs": {
                "pca_number": "PCA/RAJ/2025/1842",
                "forest_diversion_id": "FC-8821-2024",
                "state_campa_account": "Rajasthan State CAMPA",
                "state_name": "Rajasthan",
                "ca_land_parcel_id": "Block-A",
            }
        }

    rules = {
        "pit_size_cm": {"length": 45, "width": 45, "depth": 45},
        "spacing_m": {"min": 3},
        "guard_type_required": True,
        "species_native_pct_min": 80,
    }
    merged = merge_project_into_tree_metadata(
        {},
        project=FakeProject(),  # type: ignore[arg-type]
        rules=rules,
        surveyor_name="Asha Verma",
    )
    assert merged["legal_basis"] == "compensatory_afforestation"
    assert merged["pit_size_cm"] == "45×45×45"
    assert merged["spacing_m"] == "3"
    assert merged["guard_type"] == "bamboo"
    assert merged["survival_status"] == "live"
    assert merged["surveyor_name"] == "Asha Verma"
    assert merged["maintenance_responsible"] == "Rajasthan State CAMPA"

    meta = validate_program_payload(
        "government_nhai",
        core_values={
            "species_text": "Khejri",
            "latitude": 26.9,
            "longitude": 75.7,
            "planted_at": "2026-07-01",
        },
        metadata=merged,
        photo_count=3,
    )
    assert meta["project_code"] == "CAMPA-DEMO"


def test_merge_flex_nhai_highway_segment_fills_legal_basis() -> None:
    class FakeProject:
        code = "NH-48"
        name = "NH-48 Package 3"
        scheme_code = None
        segment = "nhai_highway"
        metadata_ = {"plantation_category": "highway"}

    rules = {
        "pit_size_cm": {"length": 60, "width": 60, "depth": 60},
        "spacing_m": {"min": 6},
        "guard_type_required": True,
        "species_native_pct_min": 80,
    }
    merged = merge_project_into_tree_metadata(
        {},
        project=FakeProject(),  # type: ignore[arg-type]
        rules=rules,
        surveyor_name="Surveyor",
    )
    assert merged["legal_basis"] == "highway_plantation"
    assert merged["land_category"] == "highway_row"
    assert merged["project_code"] == "NH-48"

    meta = validate_program_payload(
        "government_nhai",
        core_values={
            "species_text": "Neem",
            "latitude": 12.9,
            "longitude": 77.5,
            "planted_at": "2026-07-01",
        },
        metadata=merged,
        photo_count=3,
    )
    assert meta["legal_basis"] == "highway_plantation"
    assert meta["land_category"] == "highway_row"


def test_merge_nhai_highway_scheme_fills_legal_basis() -> None:
    class FakeProject:
        code = "NHAI-PKG3"
        name = "Package 3"
        scheme_code = "nhai_highway"
        segment = "nhai_highway"
        metadata_ = {"scheme_refs": {"nhai_package_code": "PKG-3"}}

    merged = merge_project_into_tree_metadata(
        {},
        project=FakeProject(),  # type: ignore[arg-type]
        rules={
            "pit_size_cm": {"length": 45, "width": 45, "depth": 45},
            "spacing_m": {"min": 6},
            "guard_type_required": True,
            "species_native_pct_min": 80,
        },
        surveyor_name="Surveyor",
    )
    assert merged["legal_basis"] == "highway_plantation"
    assert merged["land_category"] == "highway_row"


def test_merge_project_without_standard_still_needs_pit_from_rules() -> None:
    class FakeProject:
        code = "NH-48"
        scheme_code = None
        metadata_ = {}

    merged = merge_project_into_tree_metadata(
        {},
        project=FakeProject(),  # type: ignore[arg-type]
        rules={
            "pit_size_cm": {"length": 60, "width": 60, "depth": 60},
            "spacing_m": {"min": 6},
            "guard_type_required": True,
        },
        surveyor_name="Surveyor",
    )
    with pytest.raises(ProgramValidationError) as exc:
        validate_program_payload(
            "government_nhai",
            core_values={
                "species_text": "Neem",
                "latitude": 12.9,
                "longitude": 77.5,
                "planted_at": "2026-07-01",
            },
            metadata=merged,
            photo_count=3,
        )
    assert "missing_required:project_code" not in exc.value.errors
    assert "missing_required:pit_size_cm" not in exc.value.errors
    assert "missing_required:legal_basis" in exc.value.errors
    assert "missing_required:land_category" in exc.value.errors
