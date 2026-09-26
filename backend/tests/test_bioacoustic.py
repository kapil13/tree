"""Tests for bioacoustic biodiversity metrics."""

from app.services.ai.bioacoustic import identify_species_from_audio
from app.services.bioacoustic.detection_tiers import apply_detection_tiers
from app.services.bioacoustic.enrichment import enrich_detection
from app.services.bioacoustic.iucn_catalog import lookup_iucn
from app.services.bioacoustic.metrics import (
    aggregate_metrics,
    biodiversity_health_score,
    shannon_diversity_index,
    simpson_diversity_index,
    species_richness,
)


def test_shannon_diversity_even_distribution():
    h = shannon_diversity_index([1, 1, 1])
    assert round(h, 3) == round(1.0986, 3)


def test_simpson_diversity_even_distribution():
    d = simpson_diversity_index([1, 1, 1])
    assert round(d, 3) == round(0.6667, 3)


def test_shannon_empty():
    assert shannon_diversity_index([]) == 0.0
    assert simpson_diversity_index([]) == 0.0


def test_biodiversity_confidence_score_range():
    detections = apply_detection_tiers(
        [
            {
                **enrich_detection("Corvus splendens", "House Crow", "bird", confidence=0.9, call_count=5),
                "regional_occurrence_match": True,
                "time_intervals": [{"start_s": 0, "end_s": 1}, {"start_s": 2, "end_s": 3}],
            }
        ]
    )
    score = biodiversity_health_score(detections=detections, duration_seconds=120, gps_verified=True)
    assert 0 <= score <= 100


def test_species_richness_accepted_only():
    detections = apply_detection_tiers(
        [
            enrich_detection("A", "A", "bird", confidence=0.95, call_count=1),
            enrich_detection("B", "B", "bird", confidence=0.55, call_count=1),
        ]
    )
    assert species_richness(detections) == 1


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


def test_production_requires_ml_stack(monkeypatch):
    import pytest

    from app.core.config import settings
    from app.services.ai import bioacoustic as bio_ai

    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(bio_ai, "birdnet_available", lambda: False)
    monkeypatch.setattr(bio_ai, "perch_available", lambda: False)

    with pytest.raises(RuntimeError, match="bioacoustic_ml_unavailable"):
        identify_species_from_audio(
            b"x" * 2000,
            duration_seconds=90.0,
            preprocessing={"wav_temp_path": "/tmp/fake.wav"},
        )


def test_production_birdnet_failure_no_stub(monkeypatch):
    import pytest

    from app.core.config import settings
    from app.services.ai import bioacoustic as bio_ai

    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "bioacoustic_pipeline", "birdnet")
    monkeypatch.setattr(bio_ai, "birdnet_available", lambda: True)
    monkeypatch.setattr(bio_ai, "run_birdnet", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("boom")))

    with pytest.raises(RuntimeError, match="bioacoustic_pipeline_failed"):
        identify_species_from_audio(
            b"x" * 2000,
            duration_seconds=90.0,
            preprocessing={"wav_temp_path": "/tmp/fake.wav"},
        )


def test_aggregate_metrics_accepted_presence_scoring():
    detections = apply_detection_tiers(
        [
            {
                **enrich_detection("Corvus splendens", "House Crow", "bird"),
                "confidence": 0.9,
                "call_count": 5,
                "regional_occurrence_match": True,
                "time_intervals": [{"start_s": 0, "end_s": 1}, {"start_s": 2, "end_s": 3}],
            },
            {
                **enrich_detection("Pycnonotus cafer", "Red-vented Bulbul", "bird"),
                "confidence": 0.8,
                "call_count": 3,
                "regional_occurrence_match": True,
                "time_intervals": [{"start_s": 0, "end_s": 1}, {"start_s": 2, "end_s": 3}],
            },
            {
                **enrich_detection("Fejervarya limnocharis", "Cricket Frog", "frog"),
                "confidence": 0.55,
                "call_count": 200,
                "regional_occurrence_match": True,
                "time_intervals": [{"start_s": 0, "end_s": 1}],
            },
        ]
    )
    metrics = aggregate_metrics(detections, duration_seconds=120, gps_verified=True)
    assert metrics["acoustic_signals_count"] == 3
    assert metrics["accepted_species_count"] == 2
    assert metrics["shannon_diversity_index"] == shannon_diversity_index([1, 1])
    assert metrics["biodiversity_confidence_score"] > 0
