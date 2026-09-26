"""Tests for mining reclamation scheme (Phase 1A)."""

from __future__ import annotations

from app.services.onboarding.audience import scheme_matches_audience
from app.services.planting_projects.templates import get_template
from app.services.schemes.metadata_fields import SCHEME_METADATA_FIELDS
from app.services.schemes.registry import get_scheme, list_schemes


def test_mining_reclamation_scheme_defaults():
    scheme = get_scheme("mining_reclamation")
    assert scheme is not None
    assert scheme["group"] == "corporate"
    assert scheme["default_segment"] == "industrial_greenbelt"
    assert scheme["default_template_code"] == "mining_reclamation_v1"
    assert "green_credit_india" in scheme["convergence_allowed"]
    assert "estate_monitoring" in scheme["convergence_allowed"]


def test_mining_reclamation_template_rules():
    tpl = get_template("mining_reclamation_v1")
    assert tpl is not None
    assert tpl["segment"] == "industrial_greenbelt"
    assert tpl["rules"]["progressive_closure_tracking"] is True
    assert "overburden_dump" in tpl["rules"]["block_types"]
    assert "Khejri" in tpl["rules"]["allowed_species"]


def test_mining_reclamation_metadata_fields():
    fields = SCHEME_METADATA_FIELDS["mining_reclamation"]
    keys = {field["key"] for field in fields}
    assert "mine_lease_number" in keys
    assert "ibm_closure_plan_ref" in keys
    assert "reclamation_block_type" in keys
    assert "closure_phase" in keys


def test_green_credit_india_links_industrial_template():
    scheme = get_scheme("green_credit_india")
    assert scheme is not None
    assert scheme["default_template_code"] == "industrial_greenbelt_v1"


def test_list_schemes_filters_mining_audience_includes_reclamation():
    items = list_schemes(audience="mining")
    codes = {item["code"] for item in items}
    assert "mining_reclamation" in codes
    assert "green_credit_india" in codes
    assert "estate_monitoring" in codes
    assert "campa_ca" not in codes


def test_scheme_matches_mining_audience():
    scheme = get_scheme("mining_reclamation")
    assert scheme is not None
    assert scheme_matches_audience(scheme, "mining") is True
    assert scheme_matches_audience(scheme, "government") is False
