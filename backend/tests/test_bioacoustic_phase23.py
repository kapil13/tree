"""Tests for bioacoustic Phase 2 (composite) and Phase 3 helpers."""

from app.services.ai.bioacoustic_types import SpeciesDetection
from app.services.bioacoustic.merge_detections import merge_species_detections, taxon_breakdown


def test_merge_species_detections_combines_calls():
    dets = [
        SpeciesDetection("Corvus splendens", "House Crow", "bird", 0.8, 3),
        SpeciesDetection("Corvus splendens", "House Crow", "bird", 0.9, 2),
        SpeciesDetection("Fejervarya limnocharis", "Cricket Frog", "frog", 0.7, 4),
    ]
    merged = merge_species_detections(dets)
    assert len(merged) == 2
    crow = next(d for d in merged if d.scientific_name == "Corvus splendens")
    assert crow.call_count == 5
    assert 0.8 <= crow.confidence <= 0.9


def test_taxon_breakdown():
    dets = [
        SpeciesDetection("A", "A", "bird", 0.8, 3),
        SpeciesDetection("B", "B", "frog", 0.7, 2),
        SpeciesDetection("C", "C", "insect", 0.6, 5),
    ]
    breakdown = taxon_breakdown(dets)
    assert breakdown["bird"] == 3
    assert breakdown["frog"] == 2
    assert breakdown["insect"] == 5


def test_stub_includes_multiple_taxa():
    from app.services.ai.bioacoustic import identify_species_from_audio

    audio = b"phase2-composite-test-audio" * 200
    result = identify_species_from_audio(audio, duration_seconds=45.0)
    taxa = {d.taxon_group for d in result.detections}
    assert len(taxa) >= 2


def test_composite_returns_empty_instead_of_failing(monkeypatch):
    from app.core.config import settings
    from app.services.ai import bioacoustic as bio_ai

    monkeypatch.setattr(settings, "bioacoustic_pipeline", "composite")
    monkeypatch.setattr(bio_ai, "birdnet_available", lambda: False)
    monkeypatch.setattr(bio_ai, "perch_available", lambda: False)
    monkeypatch.setattr(bio_ai, "frog_classifier_available", lambda: False)
    monkeypatch.setattr(bio_ai, "insect_classifier_available", lambda: False)

    result = bio_ai._run_composite(
        "/tmp/fake.wav",
        duration_seconds=90.0,
        latitude=17.38,
        longitude=78.48,
        recorded_at=None,
    )
    assert result.detections == []
    assert "no species met the confidence threshold" in result.summary
