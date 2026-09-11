"""P0 biodiversity evidence tests — tiers, confidence, versioning."""

from __future__ import annotations

import uuid

from app.services.bioacoustic.confidence import biodiversity_confidence_score
from app.services.bioacoustic.detection_tiers import (
    TIER_ACCEPTED,
    TIER_PROBABLE,
    TIER_REVIEW_REQUIRED,
    apply_detection_tiers,
    assign_detection_tier,
)
from app.services.bioacoustic.enrichment import enrich_detection
from app.services.bioacoustic.metrics import aggregate_assessment_metrics, shannon_diversity_index
from app.services.bioacoustic.methodology import recording_export_blockers


def _det(confidence: float, iucn: str = "Least Concern", regional: bool | None = True, intervals: int = 2):
    row = enrich_detection("Corvus splendens", "House Crow", "bird", confidence=confidence, call_count=5)
    row["iucn_status"] = iucn
    row["regional_occurrence_match"] = regional
    row["time_intervals"] = [{"start_s": float(i), "end_s": float(i + 1)} for i in range(intervals)]
    return apply_detection_tiers([row])[0]


def test_detection_tier_accepted():
    det = _det(0.85)
    assert det["detection_tier"] == TIER_ACCEPTED
    assert det["included_in_richness"] is True


def test_detection_tier_probable():
    det = _det(0.55)
    assert det["detection_tier"] == TIER_PROBABLE
    assert det["needs_review"] is False


def test_detection_tier_review_for_threatened():
    det = _det(0.9, iucn="Endangered")
    assert det["detection_tier"] == TIER_REVIEW_REQUIRED


def test_shannon_uses_presence_not_call_counts():
    detections = apply_detection_tiers(
        [
            {
                **_det(0.9),
                "scientific_name": "A",
                "call_count": 50,
            },
            {
                **_det(0.9),
                "scientific_name": "B",
                "call_count": 2,
            },
        ]
    )
    metrics = aggregate_assessment_metrics(detections, duration_seconds=120, gps_verified=True)
    assert metrics["accepted_species_count"] == 2
    assert metrics["shannon_diversity_index"] == shannon_diversity_index([1, 1])


def test_biodiversity_confidence_not_health_inflated_by_threatened():
    low = biodiversity_confidence_score(
        apply_detection_tiers([_det(0.9, iucn="Endangered")]),
        duration_seconds=120,
        gps_verified=True,
        gps_fallback=False,
    )
    high = biodiversity_confidence_score(
        apply_detection_tiers([_det(0.9)]),
        duration_seconds=120,
        gps_verified=True,
        gps_fallback=False,
    )
    assert low < high


def test_export_blockers_stub_pipeline():
    class Rec:
        species_detections = []
        preprocessing = {"analysis_pipeline": "stub-bioacoustic-v1"}
        gps_fallback = False

    assert "stub_pipeline" in recording_export_blockers(Rec())


def test_export_blockers_gps_fallback():
    class Rec:
        species_detections = [_det(0.9)]
        preprocessing = {"analysis_pipeline": "birdnet-analyzer-v1"}
        gps_fallback = True

    assert "gps_fallback_unverified" in recording_export_blockers(Rec())
