"""Tests for registration context helpers (Sprint B)."""

from __future__ import annotations

from app.services.geo import point_at_chainage_km
from app.services.planting_projects.registration_context import (
    format_chainage_display,
    format_chainage_label,
    inherited_standard_from_rules,
    merge_standard_into_tree_metadata,
)


def test_format_chainage_label():
    assert format_chainage_label(142.38) == "142+380"
    assert format_chainage_label(142.0) == "142+000"
    assert format_chainage_display(142.38) == "KM 142+380"


def test_inherited_standard_from_rules():
    rules = {
        "pit_size_cm": {"length": 60, "width": 60, "depth": 60},
        "spacing_m": {"min": 6.0},
        "guard_type_required": True,
        "require_pit_photo": True,
        "chainage_enabled": True,
        "min_photos": 3,
    }
    inherited = inherited_standard_from_rules(rules)
    assert inherited["pit_size_label"] == "60×60×60"
    assert inherited["spacing_m_min"] == 6.0
    assert inherited["guard_type_required"] is True
    assert inherited["require_pit_photo"] is True


def test_merge_standard_into_tree_metadata_fills_omitted_fields():
    rules = {
        "pit_size_cm": {"length": 60, "width": 60, "depth": 60},
        "spacing_m": {"min": 6.0},
        "guard_type_required": True,
    }
    merged = merge_standard_into_tree_metadata({}, rules)
    assert merged["pit_size_cm"] == "60×60×60"
    assert merged["spacing_m"] == "6.0"
    assert merged["guard_type"] == "bamboo"


def test_merge_standard_does_not_override_existing_metadata():
    rules = {
        "pit_size_cm": {"length": 60, "width": 60, "depth": 60},
        "spacing_m": {"min": 6.0},
    }
    merged = merge_standard_into_tree_metadata(
        {"pit_size_cm": "45×45×45", "spacing_m": "3"},
        rules,
    )
    assert merged["pit_size_cm"] == "45×45×45"
    assert merged["spacing_m"] == "3"


def test_point_at_chainage_km():
    line = {
        "type": "LineString",
        "coordinates": [
            [77.59, 12.97],
            [77.60, 12.98],
        ],
    }
    lat, lon = point_at_chainage_km(line, 0.0)
    assert abs(lat - 12.97) < 0.001
    assert abs(lon - 77.59) < 0.001

    lat2, lon2 = point_at_chainage_km(line, 1.0)
    assert lat2 > lat
    assert lon2 > lon
