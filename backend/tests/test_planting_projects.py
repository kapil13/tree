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
