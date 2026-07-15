"""Tests for bioacoustic biodiversity metrics."""

from app.services.ai.bioacoustic import identify_species_from_audio
from app.services.bioacoustic.iucn_catalog import enrich_detection, lookup_iucn
from app.services.bioacoustic.metrics import (
    aggregate_metrics,
    bioacoustic_health_score,
    shannon_diversity_index,
    simpson_diversity_index,
)


def test_shannon_diversity_even_distribution():
    # 3 species, equal calls → H' = ln(3)
    h = shannon_diversity_index([10, 10, 10])
    assert round(h, 3) == round(1.0986, 3)


def test_simpson_diversity_even_distribution():
    d = simpson_diversity_index([10, 10, 10])
    assert round(d, 3) == round(0.6667, 3)


def test_shannon_empty():
    assert shannon_diversity_index([]) == 0.0
    assert simpson_diversity_index([]) == 0.0


def test_bioacoustic_health_score_range():
    score = bioacoustic_health_score(
        shannon_index=2.0,
        simpson_index=0.7,
        unique_species=6,
        avg_confidence=0.85,
        detections=[{"iucn_status": "Vulnerable"}],
    )
    assert 0 <= score <= 100


def test_iucn_lookup():
    row = lookup_iucn("Corvus splendens")
    assert row is not None
    assert row.iucn_status == "Least Concern"


def test_enrich_detection_adds_iucn_fields():
    row = enrich_detection("Corvus splendens", "House Crow", "bird")
    assert row["iucn_status"] == "Least Concern"
    assert "iucn_url" in row
    assert "gbif_usage_key" in row


def test_stub_ai_identification():
    audio = b"test-audio-bytes-for-bioacoustic" * 100
    result = identify_species_from_audio(audio, duration_seconds=45.0, latitude=17.38, longitude=78.48)
    assert len(result.detections) >= 3
    assert result.summary


def test_aggregate_metrics():
    detections = [
        {**enrich_detection("Corvus splendens", "House Crow", "bird"), "confidence": 0.9, "call_count": 5},
        {**enrich_detection("Pycnonotus cafer", "Red-vented Bulbul", "bird"), "confidence": 0.8, "call_count": 3},
    ]
    metrics = aggregate_metrics(detections)
    assert metrics["total_species_count"] == 2
    assert metrics["total_calls_detected"] == 8
    assert metrics["shannon_diversity_index"] > 0
    assert metrics["simpson_diversity_index"] > 0
    assert 0 <= metrics["bioacoustic_health_score"] <= 100
