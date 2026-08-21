"""Tests for central scheme registry and resolution."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.services.planting_projects.templates import get_template
from app.services.schemes.registry import get_scheme, list_schemes, scheme_codes
from app.services.schemes.resolution import apply_scheme_defaults, validate_scheme_selection


def test_registry_has_nine_plus_schemes():
    codes = scheme_codes()
    assert len(codes) >= 9
    assert "campa_ca" in codes
    assert "nhai_highway" in codes
    assert "sahakar_van" in codes
    assert "green_credit_india" in codes


def test_get_scheme_unknown():
    assert get_scheme("not_a_scheme") is None


def test_list_schemes_filters_by_program():
    govt = list_schemes(program_code="government_nhai")
    assert govt
    assert all("government_nhai" in s["program_codes"] for s in govt)
    assert all(s["code"] != "green_credit_india" or "government_nhai" in s["program_codes"] for s in govt)


def test_nhai_scheme_defaults():
    scheme = get_scheme("nhai_highway")
    assert scheme is not None
    assert scheme["default_segment"] == "nhai_highway"
    assert scheme["default_template_code"] == "nhai_highway_v1"
    assert scheme["legacy_plantation_category"] == "highway"


def test_nagar_van_scheme_defaults():
    scheme = get_scheme("nagar_van")
    assert scheme is not None
    assert scheme["default_segment"] == "nagar_van_urban"
    assert scheme["default_template_code"] == "nagar_van_urban_forest_v1"
    assert scheme["legacy_plantation_category"] == "municipal"


def test_apply_scheme_defaults_from_scheme():
    scheme = get_scheme("campa_ca")
    assert scheme is not None
    assert scheme["default_template_code"] == "campa_ca_v1"
    segment, compliance, template = apply_scheme_defaults(
        scheme=scheme,
        segment="general",
        compliance_mode="guided",
        program_code="government_nhai",
        standard_template_code=None,
    )
    assert segment == "general"
    assert compliance == "strict"
    assert template == "campa_ca_v1"


def test_campa_template_has_ca_planting_rules():
    tpl = get_template("campa_ca_v1")
    assert tpl is not None
    assert tpl["compliance_mode"] == "strict"
    assert tpl["rules"]["pit_size_cm"]["length"] == 45
    assert tpl["rules"]["spacing_m"]["min"] == 3.0
    assert tpl["rules"]["guard_type_required"] is True
    assert tpl["rules"]["species_native_pct_min"] == 80


def test_apply_scheme_defaults_without_scheme_uses_program():
    segment, compliance, template = apply_scheme_defaults(
        scheme=None,
        segment="general",
        compliance_mode="guided",
        program_code="government_nhai",
        standard_template_code=None,
    )
    assert segment == "nhai_highway"
    assert compliance == "strict"
    assert template is None


def test_validate_scheme_required_for_government():
    with pytest.raises(HTTPException) as exc:
        validate_scheme_selection(scheme_code=None, program_code="government_nhai")
    assert exc.value.status_code == 422
    assert exc.value.detail == "scheme_code_required"


def test_validate_scheme_program_mismatch():
    with pytest.raises(HTTPException) as exc:
        validate_scheme_selection(scheme_code="nagar_van", program_code="ngo_community")
    assert exc.value.status_code == 422
    assert exc.value.detail == "scheme_program_mismatch"


def test_validate_scheme_accepts_matching_program():
    scheme = validate_scheme_selection(
        scheme_code="mishti_mangrove",
        program_code="ngo_community",
    )
    assert scheme is not None
    assert scheme["code"] == "mishti_mangrove"
