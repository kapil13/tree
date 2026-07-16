"""Tests for BirdNET detection selection and grouping."""

from app.services.bioacoustic.birdnet_runner import _group_species, _select_location_detections


def test_select_location_prefers_predicted_species():
    raw = [
        {"scientific_name": "A", "is_predicted_for_location_and_date": False, "confidence": 0.9},
        {"scientific_name": "B", "is_predicted_for_location_and_date": True, "confidence": 0.8},
    ]
    selected = _select_location_detections(raw, return_all=True)
    assert len(selected) == 1
    assert selected[0]["scientific_name"] == "B"


def test_select_location_falls_back_when_geo_filter_empty():
    raw = [
        {"scientific_name": "A", "is_predicted_for_location_and_date": False, "confidence": 0.9},
        {"scientific_name": "B", "is_predicted_for_location_and_date": False, "confidence": 0.8},
    ]
    selected = _select_location_detections(raw, return_all=True)
    assert len(selected) == 2


def test_group_species_aggregates_calls():
    raw = [
        {
            "scientific_name": "Corvus splendens",
            "common_name": "House Crow",
            "confidence": 0.7,
        },
        {
            "scientific_name": "Corvus splendens",
            "common_name": "House Crow",
            "confidence": 0.5,
        },
        {
            "scientific_name": "Pycnonotus cafer",
            "common_name": "Red-vented Bulbul",
            "confidence": 0.6,
        },
    ]
    grouped = _group_species(raw)
    assert len(grouped) == 2
    crow = next(d for d in grouped if d.scientific_name == "Corvus splendens")
    assert crow.call_count == 2
    assert crow.confidence == 0.6
