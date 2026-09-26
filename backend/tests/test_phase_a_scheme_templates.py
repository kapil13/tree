"""Phase A — central scheme templates."""

from __future__ import annotations

from app.services.planting_projects.templates import get_template, list_templates
from app.services.schemes.registry import get_scheme


def test_dfi_green_corridor_template_exists():
    tpl = get_template("dfi_green_corridor_v1")
    assert tpl is not None
    assert tpl["segment"] == "nhai_highway"
    assert tpl["rules"]["chainage_enabled"] is True
    assert "world_bank_esf" in tpl["rules"]["safeguard_profiles"]


def test_gim_restoration_template_linked_in_registry():
    scheme = get_scheme("gim_restoration")
    assert scheme is not None
    assert scheme["default_template_code"] == "gim_restoration_v1"
    tpl = get_template("gim_restoration_v1")
    assert tpl is not None
    assert tpl["rules"]["gim_sub_mission_tracking"] is True


def test_mishti_mangrove_template_linked_in_registry():
    scheme = get_scheme("mishti_mangrove")
    assert scheme is not None
    assert scheme["default_template_code"] == "mishti_mangrove_v1"
    tpl = get_template("mishti_mangrove_v1")
    assert tpl is not None
    assert tpl["rules"]["coastal_crz_aware"] is True


def test_mgnrega_convergence_template_linked_in_registry():
    scheme = get_scheme("mgnrega_convergence")
    assert scheme is not None
    assert scheme["default_template_code"] == "mgnrega_convergence_v1"
    tpl = get_template("mgnrega_convergence_v1")
    assert tpl is not None
    assert tpl["rules"]["mgnrega_convergence_required"] is True


def test_jal_shakti_template_linked_in_registry():
    scheme = get_scheme("jal_shakti_riparian")
    assert scheme is not None
    assert scheme["default_template_code"] == "jal_shakti_riparian_v1"
    tpl = get_template("jal_shakti_riparian_v1")
    assert tpl is not None
    assert tpl["rules"]["riparian_buffer_m_min"] == 30


def test_scheme_template_map_resolves_dfi():
    from app.services.planting_projects.rule_engine import build_scheme_template_map

    mapping = {row["scheme_code"]: row for row in build_scheme_template_map()}
    dfi = mapping.get("dfi_green_corridor")
    assert dfi is not None
    assert dfi["template_name"] == "DFI Green Corridor — NHAI / CAMPA"


def test_template_count_includes_phase_a_entries():
    codes = {tpl["code"] for tpl in list_templates()}
    assert "dfi_green_corridor_v1" in codes
    assert "gim_restoration_v1" in codes
    assert "mishti_mangrove_v1" in codes
    assert "mgnrega_convergence_v1" in codes
    assert "jal_shakti_riparian_v1" in codes
