"""Tests for state-level plantation schemes."""

from __future__ import annotations

from app.services.planting_projects.templates import get_template
from app.services.schemes.metadata_fields import SCHEME_METADATA_FIELDS
from app.services.schemes.registry import get_scheme, list_schemes


def test_raj_amrit_poshan_vatika_scheme_defaults():
    scheme = get_scheme("raj_amrit_poshan_vatika")
    assert scheme is not None
    assert scheme["group"] == "state"
    assert scheme["default_segment"] == "nutri_garden"
    assert scheme["default_template_code"] == "amrit_poshan_vatika_v1"
    assert scheme["state_codes"] == ["08"]
    assert scheme["checklist_codes"] == ["nutri_garden", "mgnrega_convergence"]
    assert "amrit_poshan_vatika" in scheme["framework_profiles"]


def test_amrit_poshan_vatika_template_rules():
    tpl = get_template("amrit_poshan_vatika_v1")
    assert tpl is not None
    assert tpl["segment"] == "nutri_garden"
    assert tpl["rules"]["site_area_ha"]["max"] == 0.5
    assert tpl["rules"]["min_trees_project"] == 50
    assert "Guava" in tpl["rules"]["allowed_species"]
    assert "school_plot" in tpl["rules"]["block_types"]


def test_amrit_poshan_metadata_fields():
    fields = SCHEME_METADATA_FIELDS["raj_amrit_poshan_vatika"]
    keys = {field["key"] for field in fields}
    assert "apv_site_id" in keys
    assert "shg_name" in keys
    assert "mgnrega_job_card_ref" in keys


def test_list_schemes_filters_by_state_code():
    rajasthan = list_schemes(state_code="08")
    codes = {item["code"] for item in rajasthan}
    assert "raj_amrit_poshan_vatika" in codes
    assert "campa_ca" in codes

    maharashtra = list_schemes(state_code="27")
    mh_codes = {item["code"] for item in maharashtra}
    assert "raj_amrit_poshan_vatika" not in mh_codes
    assert "mh_van_mahotsav" in mh_codes
    assert "campa_ca" in mh_codes

    gujarat = list_schemes(state_code="24")
    assert "gj_social_forestry" in {item["code"] for item in gujarat}
