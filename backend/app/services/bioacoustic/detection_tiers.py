"""Detection confidence tiers for bioacoustic species identifications."""

from __future__ import annotations

from typing import Any

from app.core.config import settings

_THREATENED = frozenset({"Critically Endangered", "Endangered", "Vulnerable"})
TIER_ACCEPTED = "accepted"
TIER_PROBABLE = "probable"
TIER_REVIEW_REQUIRED = "review_required"

ACCEPTED_MIN_CONFIDENCE = 0.70
PROBABLE_MIN_CONFIDENCE = 0.40


def assign_detection_tier(det: dict[str, Any]) -> str:
    """
    Classify a detection:
    - accepted: high confidence with corroboration
    - probable: medium confidence or weak corroboration
    - review_required: low confidence or conservation-relevant
    """
    confidence = float(det.get("confidence") or 0)
    iucn_status = det.get("iucn_status") or ""
    intervals = det.get("time_intervals") or []
    regional_match = det.get("regional_occurrence_match")

    if confidence < PROBABLE_MIN_CONFIDENCE:
        return TIER_REVIEW_REQUIRED
    if iucn_status in _THREATENED:
        return TIER_REVIEW_REQUIRED

    review_threshold = settings.bioacoustic_review_confidence
    if confidence < review_threshold:
        return TIER_PROBABLE

    corroborated = regional_match is True or len(intervals) >= 2
    if confidence >= ACCEPTED_MIN_CONFIDENCE and corroborated:
        return TIER_ACCEPTED
    if confidence >= ACCEPTED_MIN_CONFIDENCE and regional_match is not False:
        return TIER_ACCEPTED
    if confidence >= ACCEPTED_MIN_CONFIDENCE:
        return TIER_PROBABLE
    return TIER_PROBABLE


def apply_detection_tiers(detections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for det in detections:
        row = dict(det)
        tier = assign_detection_tier(row)
        row["detection_tier"] = tier
        row["needs_review"] = tier == TIER_REVIEW_REQUIRED
        row["included_in_richness"] = tier == TIER_ACCEPTED
        out.append(row)
    return out


def accepted_detections(detections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [d for d in detections if d.get("detection_tier") == TIER_ACCEPTED]


def exportable_detections(detections: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Detections safe for compliance exports (accepted tier only)."""
    return accepted_detections(detections)


def tier_counts(detections: list[dict[str, Any]]) -> dict[str, int]:
    counts = {TIER_ACCEPTED: 0, TIER_PROBABLE: 0, TIER_REVIEW_REQUIRED: 0}
    for det in detections:
        tier = det.get("detection_tier") or TIER_REVIEW_REQUIRED
        counts[tier] = counts.get(tier, 0) + 1
    return counts
