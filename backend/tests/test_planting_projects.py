"""Tests for planting project templates and geo helpers."""

from __future__ import annotations

from app.services.geo import corridor_polygon_from_line
from app.services.planting_projects.templates import (
    STANDARD_TEMPLATES,
    get_template,
    list_templates,
    template_for_segment,
)


def test_all_segment_templates_exist():
    segments = {
        "nhai_highway",
        "industrial_greenbelt",
        "township_landscape",
        "nagar_van_urban",
        "sahakar_van_coop",
        "ngo_watershed",
        "general",
    }
    for segment in segments:
        tpl = template_for_segment(segment)
        assert tpl["segment"] == segment or segment == "general"
        assert "rules" in tpl


def test_nhai_template_spacing():
    tpl = get_template("nhai_highway_v1")
    assert tpl is not None
    assert tpl["rules"]["spacing_m"]["min"] == 6.0
    assert tpl["compliance_mode"] == "strict"


def test_list_templates_filter_segment():
    nhai = list_templates(segment="nhai_highway")
    assert len(nhai) >= 1
    assert all(t["segment"] == "nhai_highway" for t in nhai)


def test_corridor_buffer_produces_polygon():
    line = {
        "type": "LineString",
        "coordinates": [
            [77.59, 12.97],
            [77.60, 12.98],
            [77.61, 12.99],
        ],
    }
    poly = corridor_polygon_from_line(line, buffer_m=15.0)
    assert poly["type"] == "Polygon"
    ring = poly["coordinates"][0]
    assert len(ring) >= 4


def test_open_template_is_permissive():
    tpl = STANDARD_TEMPLATES["open_byot_v1"]
    assert tpl["rules"]["spacing_m"] is None
    assert tpl["compliance_mode"] == "open"


def test_nagar_van_urban_forest_template():
    tpl = get_template("nagar_van_urban_forest_v1")
    assert tpl is not None
    assert tpl["segment"] == "nagar_van_urban"
    assert tpl["compliance_mode"] == "strict"
    assert tpl["rules"]["layout_pattern"] == "cluster"
    assert tpl["rules"]["min_trees_project"] == 10000
    assert tpl["rules"]["species_native_pct_min"] == 80
    assert tpl["rules"]["work_area_geometry"] == "polygon"


def test_nagar_van_scheme_uses_urban_forest_template():
    from app.services.schemes.registry import get_scheme

    scheme = get_scheme("nagar_van")
    assert scheme is not None
    assert scheme["default_segment"] == "nagar_van_urban"
    assert scheme["default_template_code"] == "nagar_van_urban_forest_v1"


def test_sahakar_van_cooperative_template():
    tpl = get_template("sahakar_van_cooperative_v1")
    assert tpl is not None
    assert tpl["segment"] == "sahakar_van_coop"
    assert tpl["compliance_mode"] == "strict"
    assert tpl["rules"]["layout_pattern"] == "miyawaki_cluster"
    assert tpl["rules"]["species_native_pct_min"] == 100
    assert tpl["rules"]["rainwater_harvest_required"] is True
    assert "Khejri" in tpl["rules"]["allowed_species"]
    assert tpl["rules"]["site_area_acres_reference"] == 64


def test_sahakar_van_scheme_defaults():
    from app.services.schemes.registry import get_scheme

    scheme = get_scheme("sahakar_van")
    assert scheme is not None
    assert scheme["group"] == "cooperative"
    assert scheme["ministry"] == "Ministry of Cooperation"
    assert scheme["default_segment"] == "sahakar_van_coop"
    assert scheme["default_template_code"] == "sahakar_van_cooperative_v1"
    assert "ngo_community" in scheme["program_codes"]
    assert scheme["checklist_codes"] == ["sahakar_van_coop"]


def test_risk_from_signals_critical():
    from app.services.planting_projects.pest_intel import _risk_from_signals

    assert (
        _risk_from_signals(
            pest_needed=True,
            disease_needed=True,
            ndvi_trend="declining",
            health_pct=40.0,
            rain_mm_48h=50.0,
        )
        == "critical"
    )
