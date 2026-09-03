"""Tests for agro-climatic zone species recommendations."""

from __future__ import annotations

from app.services.planting_projects.climate_zones import resolve_climate_zone
from app.services.planting_projects.species_recommendations import recommend_species


def test_alwar_is_semi_arid_not_arid():
    climate = resolve_climate_zone(state_code="08", district_code="104")
    assert climate is not None
    assert climate["code"] == "semi_arid"
    assert climate["label"] == "Semi-arid"


def test_jaisalmer_is_arid():
    climate = resolve_climate_zone(state_code="08", district_code="114")
    assert climate is not None
    assert climate["code"] == "arid"


def test_campa_alwar_excludes_sal():
    result = recommend_species(
        state_code="08",
        state_name="Rajasthan",
        district_code="104",
        district_name="Alwar",
        scheme_code="campa_ca",
        segment="general",
        rules={},
    )
    names = [s["common_name"] for s in result["suggestions"]]
    assert "Sal" not in names
    assert "Khejri" in names
    assert result["context"]["climate_zone"] == "semi_arid"
    assert result["context"]["climate_zone_label"] == "Semi-arid"


def test_campa_assam_moist_includes_sal():
    result = recommend_species(
        state_code="18",
        state_name="Assam",
        scheme_code="campa_ca",
        segment="general",
        rules={},
    )
    names = [s["common_name"] for s in result["suggestions"]]
    assert "Sal" in names
    assert result["context"]["climate_zone"] == "moist"


def test_himalayan_hp_excludes_coconut():
    result = recommend_species(
        state_code="02",
        state_name="Himachal Pradesh",
        scheme_code="campa_ca",
        segment="general",
        rules={},
    )
    names = [s["common_name"] for s in result["suggestions"]]
    assert "Deodar" in names
    assert "Coconut" not in names
    assert result["context"]["climate_zone"] == "himalayan"


def test_kerala_coastal_species():
    result = recommend_species(
        state_code="32",
        state_name="Kerala",
        scheme_code="campa_ca",
        segment="general",
        rules={},
    )
    names = [s["common_name"] for s in result["suggestions"]]
    assert "Coconut" in names
    assert result["context"]["climate_zone"] == "coastal"
