"""Tests for GBIF regional fauna integration."""

from unittest.mock import MagicMock, patch

from app.services.bioacoustic.regional_fauna import annotate_regional_match, build_regional_fauna


def test_annotate_regional_match_flags_known_species():
    regional = [
        {
            "scientific_name": "Corvus splendens",
            "common_name": "House Crow",
            "taxon_group": "bird",
            "gbif_usage_key": 1,
            "occurrence_count": 10,
            "taxon_class": "Aves",
            "taxon_kingdom": "Animalia",
        }
    ]
    detections = [
        {"scientific_name": "Corvus splendens", "common_name": "House Crow"},
        {"scientific_name": "Unknown bird", "common_name": "Unknown"},
    ]

    with patch(
        "app.services.bioacoustic.regional_fauna.fetch_species_near",
        return_value=regional,
    ):
        out = annotate_regional_match(detections, 17.38, 78.48)

    assert out[0]["regional_occurrence_match"] is True
    assert out[1]["regional_occurrence_match"] is False


def test_build_regional_fauna_enriches_with_iucn():
    gbif_rows = [
        {
            "scientific_name": "Corvus splendens",
            "common_name": "House Crow",
            "taxon_group": "bird",
            "gbif_usage_key": 5231190,
            "occurrence_count": 42,
            "taxon_class": "Aves",
            "taxon_kingdom": "Animalia",
        }
    ]

    with patch(
        "app.services.bioacoustic.regional_fauna.fetch_species_near",
        return_value=gbif_rows,
    ):
        data = build_regional_fauna(17.38, 78.48, limit=10)

    assert data["provider"] == "gbif+iucn"
    assert data["species_count"] == 1
    assert data["species"][0]["iucn_status"] == "Least Concern"
    assert data["species"][0]["metadata_sources"]["gbif"] == "gbif_occurrence"
