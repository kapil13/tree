"""Tests for central scheme phases 3–7."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.services.compliance.checklists import get_checklist
from app.services.schemes.compliance import checklists_for_scheme
from app.services.schemes.imports.campa_apo_csv import parse_campa_apo_csv
from app.services.schemes.metadata_fields import metadata_sections_for_scheme
from app.services.schemes.registry import get_scheme
from app.services.schemes.validation import validate_scheme_metadata


def test_metadata_sections_wired_for_campa():
    sections = metadata_sections_for_scheme("campa_ca")
    assert len(sections) == 1
    assert sections[0]["id"] == "scheme_refs"
    field_keys = {f["key"] for f in sections[0]["fields"]}
    assert "pca_number" in field_keys
    assert "apo_financial_year" in field_keys


def test_registry_has_metadata_sections_after_hydrate():
    scheme = get_scheme("campa_ca")
    assert scheme is not None
    assert len(scheme["metadata_sections"]) == 1


def test_validate_scheme_metadata_required_fields():
    with pytest.raises(HTTPException) as exc:
        validate_scheme_metadata(
            "campa_ca",
            {"scheme_refs": {}},
            strict=True,
        )
    assert exc.value.status_code == 422
    detail = exc.value.detail
    assert detail["code"] == "scheme_metadata_invalid"
    assert "pca_number" in detail["fields"]


def test_validate_scheme_metadata_accepts_valid_campa_refs():
    result = validate_scheme_metadata(
        "campa_ca",
        {
            "scheme_refs": {
                "pca_number": "PCA/RAJ/2025/1842",
                "forest_diversion_id": "FC-8821-2024",
                "apo_financial_year": "2025-26",
                "state_name": "Rajasthan",
            }
        },
        strict=True,
    )
    assert result["scheme_refs"]["pca_number"] == "PCA/RAJ/2025/1842"


def test_scheme_specific_checklists_exist():
    assert get_checklist("gim_general") is not None
    assert get_checklist("mishti_coastal") is not None
    assert get_checklist("mgnrega_convergence") is not None
    assert get_checklist("nagar_van_urban") is not None
    assert get_checklist("green_credit_india") is not None


def test_checklists_for_scheme_uses_registry():
    codes = checklists_for_scheme("mishti_mangrove")
    assert codes == ["mishti_coastal"]


def test_parse_campa_apo_csv():
    csv_text = """pca_number,state_name,apo_financial_year,project_code,project_name
PCA/RAJ/2025/1,Rajasthan,2025-26,DEMO-01,Demo CA Block
"""
    rows, errors = parse_campa_apo_csv(csv_text)
    assert not errors
    assert len(rows) == 1
    assert rows[0]["project_code"] == "DEMO-01"
    assert rows[0]["scheme_refs"]["pca_number"] == "PCA/RAJ/2025/1"


def test_parse_campa_apo_csv_missing_columns():
    rows, errors = parse_campa_apo_csv("pca_number,state_name\nx,y")
    assert not rows
    assert any("missing_columns" in e for e in errors)
