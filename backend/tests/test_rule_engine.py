"""Tests for CMS planting rule engine."""

from __future__ import annotations

import pytest

from app.services.planting_projects.rule_engine import (
    list_editable_template_codes,
    merge_rules,
    sanitize_override_rules,
    validate_rule_override,
)
from app.services.planting_projects.templates import STANDARD_TEMPLATES, get_template


def test_all_standard_templates_are_admin_editable() -> None:
    from app.services.planting_projects.rule_engine import is_admin_editable_template

    for code in STANDARD_TEMPLATES:
        assert is_admin_editable_template(code)
    assert len(list_editable_template_codes()) == len(STANDARD_TEMPLATES)


def test_merge_rules_overrides_spacing_and_native_pct() -> None:
    base = get_template("nagar_van_urban_forest_v1")
    assert base is not None
    merged = merge_rules(
        base["rules"],
        {
            "spacing_m": {"min": 3.0},
            "species_native_pct_min": 85,
        },
    )
    assert merged["spacing_m"]["min"] == 3.0
    assert merged["spacing_m"]["warn_below"] == 2.0
    assert merged["species_native_pct_min"] == 85


def test_sanitize_override_rules_strips_unknown_keys() -> None:
    base = get_template("nhai_highway_v1")
    assert base is not None
    cleaned = sanitize_override_rules(
        base["rules"],
        {"spacing_m": {"min": 7.0}, "unknown_key": 123, "layout_pattern": "single_row"},
    )
    assert "unknown_key" not in cleaned
    assert cleaned["spacing_m"]["min"] == 7.0


def test_validate_rule_override_rejects_bad_native_pct() -> None:
    errors = validate_rule_override({"species_native_pct_min": 150})
    assert any("species_native_pct_min" in e for e in errors)


def test_validate_rule_override_rejects_density_min_above_max() -> None:
    errors = validate_rule_override(
        {"planting_density_per_ha": {"min": 6000, "max": 1000}}
    )
    assert any("planting_density_per_ha" in e for e in errors)


@pytest.mark.parametrize(
    "code",
    [
        "nhai_highway_v1",
        "industrial_greenbelt_v1",
        "nagar_van_urban_forest_v1",
        "sahakar_van_cooperative_v1",
        "campa_ca_v1",
        "open_byot_v1",
    ],
)
def test_template_codes_are_editable(code: str) -> None:
    from app.services.planting_projects.rule_engine import is_admin_editable_template

    assert is_admin_editable_template(code)
