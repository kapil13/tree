"""Biodiversity evidence confidence score (0–100) — not ecological health."""

from __future__ import annotations

from typing import Any

from app.services.bioacoustic.detection_tiers import (
    TIER_ACCEPTED,
    TIER_REVIEW_REQUIRED,
    accepted_detections,
    tier_counts,
)

METHODOLOGY_VERSION = "biodiversity-evidence-v1"


def biodiversity_confidence_score(
    detections: list[dict[str, Any]],
    *,
    duration_seconds: float,
    gps_verified: bool,
    gps_fallback: bool,
    warning_high_noise: bool = False,
) -> float:
    """
    Transparent evidence-confidence score (0–100).
    Components: detection quality 30%, sampling 25%, spatial 20%, corroboration 15%, review clearance 10%.
    """
    if not detections:
        base_sampling = _sampling_score(duration_seconds, warning_high_noise)
        base_spatial = _spatial_score(gps_verified, gps_fallback)
        return round((0.25 * base_sampling + 0.20 * base_spatial) * 100 / 0.45, 2)

    counts = tier_counts(detections)
    total = max(len(detections), 1)
    accepted = counts.get(TIER_ACCEPTED, 0)
    review = counts.get(TIER_REVIEW_REQUIRED, 0)

    detection_quality = accepted / total
    review_clearance = 1.0 if review == 0 else max(0.0, 1.0 - (review / total))

    accepted_rows = accepted_detections(detections)
    corroborated = sum(
        1 for d in accepted_rows if d.get("regional_occurrence_match") is True
    )
    corroboration = corroborated / max(len(accepted_rows), 1) if accepted_rows else 0.0

    confidences = [float(d.get("confidence") or 0) for d in accepted_rows]
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
    detection_quality = min(1.0, detection_quality * 0.7 + avg_conf * 0.3)

    score = (
        0.30 * detection_quality
        + 0.25 * _sampling_score(duration_seconds, warning_high_noise)
        + 0.20 * _spatial_score(gps_verified, gps_fallback)
        + 0.15 * corroboration
        + 0.10 * review_clearance
    ) * 100.0
    return round(max(0.0, min(score, 100.0)), 2)


def _sampling_score(duration_seconds: float, warning_high_noise: bool) -> float:
    if duration_seconds < 60:
        duration_part = 0.2
    elif duration_seconds < 90:
        duration_part = 0.6
    elif duration_seconds <= 180:
        duration_part = 1.0
    else:
        duration_part = 0.8
    noise_part = 0.5 if warning_high_noise else 1.0
    return duration_part * noise_part


def _spatial_score(gps_verified: bool, gps_fallback: bool) -> float:
    if gps_fallback:
        return 0.15
    if gps_verified:
        return 1.0
    return 0.5
