"""P0 integration tests for Amrit Poshan Vatika scheme."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.services.compliance.checklists import get_checklist
from app.services.planting_projects.templates import get_template
from app.services.planting_projects.work_area_validation import (
    _validate_area_bounds,
    _validate_block_type,
    _validate_declared_site_area,
)
from app.services.reports.frameworks import get_framework_profile
from app.services.schemes.registry import get_scheme


def test_raj_amrit_poshan_vatika_p0_registry():
    scheme = get_scheme("raj_amrit_poshan_vatika")
    assert scheme is not None
    assert scheme["checklist_codes"] == ["nutri_garden", "mgnrega_convergence"]
    assert "amrit_poshan_vatika" in scheme["framework_profiles"]


def test_nutri_garden_checklist_exists():
    checklist = get_checklist("nutri_garden")
    assert checklist is not None
    assert checklist.short_label == "Poshan Vatika"
    item_ids = {item.id for item in checklist.items}
    assert "apv_site_id" in item_ids
    assert "fruit_tree_mix" in item_ids
    assert "min_trees_target" in item_ids


def test_amrit_poshan_vatika_framework_profile():
    profile = get_framework_profile("amrit_poshan_vatika")
    assert profile is not None
    assert profile.short_label == "Poshan Vatika"


def test_nutri_garden_template_includes_school_plot():
    tpl = get_template("amrit_poshan_vatika_v1")
    assert tpl is not None
    assert "school_plot" in tpl["rules"]["block_types"]


def test_validate_area_bounds_rejects_small_plot():
    rules = {"site_area_ha": {"min": 0.1, "max": 0.5}}
    with pytest.raises(HTTPException) as exc:
        _validate_area_bounds(rules, 0.05)
    assert exc.value.status_code == 422
    assert "work_area_too_small" in str(exc.value.detail)


def test_validate_area_bounds_rejects_large_plot():
    rules = {"site_area_ha": {"min": 0.1, "max": 0.5}}
    with pytest.raises(HTTPException) as exc:
        _validate_area_bounds(rules, 0.6)
    assert exc.value.status_code == 422
    assert "work_area_too_large" in str(exc.value.detail)


def test_validate_block_type_requires_segment_code():
    rules = {"block_types": ["anganwadi_plot", "school_plot"]}
    with pytest.raises(HTTPException) as exc:
        _validate_block_type(rules, None)
    assert exc.value.detail == "block_type_required"


def test_validate_block_type_rejects_unknown_type():
    rules = {"block_types": ["anganwadi_plot", "school_plot"]}
    with pytest.raises(HTTPException) as exc:
        _validate_block_type(rules, "ward_park")
    assert "invalid_block_type" in str(exc.value.detail)


def test_validate_declared_site_area_mismatch():
    from types import SimpleNamespace

    project = SimpleNamespace(
        metadata_={"scheme_refs": {"site_area_ha": 0.25}},
    )
    with pytest.raises(HTTPException) as exc:
        _validate_declared_site_area(project, 0.5)
    assert "work_area_site_area_mismatch" in str(exc.value.detail)
