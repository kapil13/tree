"""P1 biodiversity tests — review workflow, periods, hotspots, audit bundle."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from app.services.bioacoustic.detection_tiers import TIER_ACCEPTED, TIER_REVIEW_REQUIRED, apply_detection_tiers
from app.services.bioacoustic.enrichment import enrich_detection
from app.services.bioacoustic.hotspots import compute_hotspots
from app.services.bioacoustic.methodology import recording_export_blockers
from app.services.bioacoustic.monitoring_periods import compare_monitoring_periods, duration_compatible, seasons_compatible
from app.services.bioacoustic.review import (
    DECISION_CONFIRMED,
    apply_reviews_to_detections,
    detection_needs_review,
    reviews_index,
)


class _Review:
    def __init__(self, scientific_name: str, decision: str, analysis_run_id=None):
        self.scientific_name = scientific_name
        self.decision = decision
        self.analysis_run_id = analysis_run_id
        self.reviewer_user_id = uuid.uuid4()
        self.reviewed_at = datetime.now(UTC)
        self.notes = None


def _det(confidence: float, iucn: str = "Endangered"):
    row = enrich_detection("Testus species", "Test species", "bird", confidence=confidence, call_count=3)
    row["iucn_status"] = iucn
    row["regional_occurrence_match"] = True
    row["time_intervals"] = [{"start_s": 0, "end_s": 1}]
    return apply_detection_tiers([row])[0]


def test_human_confirm_clears_threatened_export_blocker():
    det = _det(0.9, iucn="Endangered")
    assert det["detection_tier"] == TIER_REVIEW_REQUIRED

    class Rec:
        species_detections = [det]
        preprocessing = {"analysis_pipeline": "birdnet-analyzer-v1"}
        gps_fallback = False
        latest_analysis_run_id = None
        detection_reviews = [_Review("Testus species", DECISION_CONFIRMED)]

    blockers = recording_export_blockers(Rec(), reviews=Rec.detection_reviews)
    assert "threatened_taxa_require_review" not in blockers


def test_apply_reviews_promotes_confirmed_to_accepted():
    det = _det(0.9, iucn="Endangered")
    reviews = [_Review("Testus species", DECISION_CONFIRMED)]
    out = apply_reviews_to_detections([det], reviews)
    assert out[0]["detection_tier"] == TIER_ACCEPTED
    assert out[0]["included_in_richness"] is True


def test_detection_needs_review_until_confirmed():
    det = _det(0.9, iucn="Endangered")
    idx = reviews_index([])
    assert detection_needs_review(det, idx) is True
    idx = reviews_index([_Review("Testus species", DECISION_CONFIRMED)])
    assert detection_needs_review(det, idx) is False


def test_seasons_compatible():
    assert seasons_compatible("monsoon", "wet") is True
    assert seasons_compatible("dry", "monsoon") is False


def test_duration_compatible():
    assert duration_compatible([120, 130, 110]) is True
    assert duration_compatible([60, 180]) is False


def test_hotspots_require_repeated_evidence():
    class Rec:
        def __init__(self, rec_id: str, lon: float, lat: float, species: str):
            self.id = uuid.UUID(rec_id)
            self.status = "analyzed"
            self.latest_analysis_run_id = None
            self.detection_reviews = []
            self.location = type("Loc", (), {})()
            from geoalchemy2.elements import WKTElement

            self.location = WKTElement(f"POINT({lon} {lat})", srid=4326)
            det = enrich_detection(species, species, "bird", confidence=0.9, call_count=2)
            det["detection_tier"] = TIER_ACCEPTED
            self.species_detections = [det]

    rec_a = Rec("00000000-0000-4000-8000-000000000001", 78.48, 17.38, "Corvus splendens")
    rec_b = Rec("00000000-0000-4000-8000-000000000002", 78.481, 17.381, "Corvus splendens")
    rec_c = Rec("00000000-0000-4000-8000-000000000003", 79.0, 18.0, "Other species")

    hotspots = compute_hotspots([rec_a, rec_b, rec_c], min_recordings=2)
    assert any("Corvus splendens" in h["scientific_name"] and h["recording_count"] >= 2 for h in hotspots)


async def test_compare_monitoring_periods():
    from app.models.bioacoustic_monitoring_period import BioacousticMonitoringPeriod

    fence_id = uuid.uuid4()
    now = datetime.now(UTC)
    period_a = BioacousticMonitoringPeriod(
        fence_id=fence_id,
        label="Baseline",
        period_start=now - timedelta(days=60),
        period_end=now - timedelta(days=30),
        season_class="dry",
    )
    period_b = BioacousticMonitoringPeriod(
        fence_id=fence_id,
        label="Follow-up",
        period_start=now - timedelta(days=29),
        period_end=now,
        season_class="dry",
    )
    period_a.recordings = []
    period_b.recordings = []

    class _Db:
        pass

    data = await compare_monitoring_periods(_Db(), period_a, period_b)
    assert data["fence_id"] == str(fence_id)
    assert data["compatibility"]["season_compatible"] is True
