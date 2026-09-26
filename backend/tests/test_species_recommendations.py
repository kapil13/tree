"""Tests for non-binding species recommendations."""

from __future__ import annotations

from types import SimpleNamespace

from app.services.planting_projects.species_recommendations import recommend_species


def test_rajasthan_campa_includes_khejri_not_sal():
    result = recommend_species(
        state_code="08",
        state_name="Rajasthan",
        district_code="114",
        district_name="Jaisalmer",
        segment="general",
        scheme_code="campa_ca",
        rules={},
    )
    names = [s["common_name"] for s in result["suggestions"]]
    assert "Khejri" in names
    assert "Sal" not in names
    assert result["binding"] is False
    assert result["context"]["has_location"] is True
    assert result["context"]["climate_zone"] == "arid"


def test_highway_segment_adds_zone_appropriate_species():
    result = recommend_species(
        state_code="08",
        state_name="Rajasthan",
        district_code="114",
        segment="nhai_highway",
        scheme_code="nhai_highway",
        rules={},
    )
    names = [s["common_name"] for s in result["suggestions"]]
    assert "Neem" in names
    assert "Gulmohar" not in names


def test_maharashtra_district_boosts_local_species():
    result = recommend_species(
        state_code="27",
        state_name="Maharashtra",
        district_code="27-01",
        district_name="Ahmednagar",
        segment="nagar_van_urban",
        rules={},
    )
    names = [s["common_name"] for s in result["suggestions"]]
    assert "Neem" in names
    assert result["context"]["climate_zone"] == "semi_arid"


def test_suggestions_include_scientific_name_when_catalogued():
    result = recommend_species(
        state_code="27",
        state_name="Maharashtra",
        segment="general",
        rules={},
    )
    neem = next(s for s in result["suggestions"] if s["common_name"] == "Neem")
    assert neem["scientific_name"] == "Azadirachta indica"


def test_recommend_for_project_uses_metadata_location():
    from app.services.planting_projects.species_recommendations import recommend_for_project

    project = SimpleNamespace(
        segment="campa_ca",
        scheme_code="campa_ca",
        metadata_={
            "location": {
                "state_code": "08",
                "state_name": "Rajasthan",
                "district_code": "104",
                "district_name": "Alwar",
            }
        },
    )

    result = recommend_for_project(project, rules={})
    names = [s["common_name"] for s in result["suggestions"]]
    assert "Khejri" in names
    assert result["context"]["climate_zone"] == "semi_arid"


def test_preview_campa_rajasthan_alwar_zone_aware():
    from app.services.planting_projects.templates import get_template

    tpl = get_template("campa_ca_v1")
    assert tpl is not None
    result = recommend_species(
        state_code="08",
        state_name="Rajasthan",
        district_code="104",
        district_name="Alwar",
        scheme_code="campa_ca",
        segment=tpl["segment"],
        rules=tpl["rules"],
    )
    names = [s["common_name"] for s in result["suggestions"]]
    assert "Teak" not in names or names.index("Khejri") < names.index("Teak") if "Teak" in names else True
    assert "Khejri" in names
    assert len(names) >= 6
