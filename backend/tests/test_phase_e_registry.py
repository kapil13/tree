"""Phase E — registry expansion: township, agroforestry, state schemes."""

from __future__ import annotations

from app.services.compliance.checklists import get_checklist
from app.services.planting_projects.templates import get_template
from app.services.schemes.metadata_fields import SCHEME_METADATA_FIELDS
from app.services.schemes.registry import get_scheme, list_schemes


def test_township_landscape_scheme_registered():
    scheme = get_scheme("township_landscape")
    assert scheme is not None
    assert scheme["default_segment"] == "township_landscape"
    assert scheme["default_template_code"] == "township_landscape_v1"
    assert "township_landscape" in scheme["checklist_codes"]
    assert get_template("township_landscape_v1") is not None
    assert get_checklist("township_landscape") is not None


def test_agroforestry_farm_scheme_registered():
    scheme = get_scheme("agroforestry_farm")
    assert scheme is not None
    assert scheme["default_template_code"] == "agroforestry_farm_v1"
    assert "fra_tenure" in scheme["checklist_codes"]
    assert "agroforestry_farm" in scheme["checklist_codes"]
    tpl = get_template("agroforestry_farm_v1")
    assert tpl is not None
    assert tpl["rules"]["agroforestry_mode"] is True
    assert get_checklist("agroforestry_farm") is not None


def test_maharashtra_state_scheme_filter():
    scheme = get_scheme("mh_van_mahotsav")
    assert scheme is not None
    assert scheme["group"] == "state"
    assert scheme["state_codes"] == ["27"]
    mh = list_schemes(state_code="27")
    codes = {item["code"] for item in mh}
    assert "mh_van_mahotsav" in codes
    assert "raj_amrit_poshan_vatika" not in codes


def test_gujarat_state_scheme_filter():
    scheme = get_scheme("gj_social_forestry")
    assert scheme is not None
    assert scheme["state_codes"] == ["24"]
    gj = list_schemes(state_code="24")
    assert "gj_social_forestry" in {item["code"] for item in gj}


def test_phase_e_metadata_fields_present():
    for code in (
        "township_landscape",
        "agroforestry_farm",
        "mh_van_mahotsav",
        "gj_social_forestry",
    ):
        fields = SCHEME_METADATA_FIELDS.get(code) or []
        assert fields, f"expected metadata fields for {code}"
