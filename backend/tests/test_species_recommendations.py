"""Tests for non-binding species recommendations."""

from __future__ import annotations

from types import SimpleNamespace

from app.services.planting_projects.species_recommendations import recommend_species


def test_rajasthan_campa_includes_khejri_and_teak():
    result = recommend_species(
        state_code="08",
        state_name="Rajasthan",
        segment="general",
        scheme_code="campa_ca",
        rules={
            "native_species_examples": [
                "Teak",
                "Sal",
                "Bamboo",
                "Neem",
                "Jamun",
            ],
        },
    )
    names = [s["common_name"] for s in result["suggestions"]]
    assert "Khejri" in names
    assert "Teak" in names
    assert result["binding"] is False
    assert result["context"]["has_location"] is True


def test_highway_segment_adds_avenue_species_without_location():
    result = recommend_species(
        segment="nhai_highway",
        scheme_code="nhai_highway",
        rules={},
    )
    names = [s["common_name"] for s in result["suggestions"]]
    assert "Neem" in names
    assert "Gulmohar" in names
    assert result["context"]["has_location"] is False


def test_maharashtra_district_boosts_local_species():
    result = recommend_species(
        state_code="27",
        state_name="Maharashtra",
        district_code="27-01",
        district_name="Ahmednagar",
        segment="nagar_van_urban",
        rules={
            "native_species_examples": ["Neem", "Peepal", "Banyan", "Jamun"],
        },
    )
    names = [s["common_name"] for s in result["suggestions"]]
    assert "Neem" in names
    assert any("Maharashtra" in r for s in result["suggestions"] for r in s["reasons"])


def test_suggestions_include_scientific_name_when_catalogued():
    result = recommend_species(
        state_code="27",
        state_name="Maharashtra",
        segment="general",
        rules={"native_species_examples": ["Neem"]},
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
                "district_code": "08-01",
                "district_name": "Ajmer",
            }
        },
    )

    result = recommend_for_project(project, rules={"native_species_examples": ["Teak"]})
    names = [s["common_name"] for s in result["suggestions"]]
    assert "Khejri" in names


def test_preview_campa_rajasthan_includes_teak_and_khejri():
    from app.services.planting_projects.templates import get_template

    tpl = get_template("campa_ca_v1")
    assert tpl is not None
    result = recommend_species(
        state_code="08",
        state_name="Rajasthan",
        district_name="Alwar",
        scheme_code="campa_ca",
        segment=tpl["segment"],
        rules=tpl["rules"],
    )
    names = [s["common_name"] for s in result["suggestions"]]
    assert "Teak" in names
    assert "Khejri" in names
    assert len(names) >= 8
