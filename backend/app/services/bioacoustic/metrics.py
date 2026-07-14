"""Biodiversity metrics: Shannon diversity index and bioacoustic health score."""

from __future__ import annotations

import math
from typing import Any

_THREATENED = {"Critically Endangered", "Endangered", "Vulnerable"}


def shannon_diversity_index(call_counts: list[int]) -> float:
    """H' = -Σ(pi * ln(pi)) over species call counts."""
    total = sum(call_counts)
    if total <= 0:
        return 0.0
    h = 0.0
    for n in call_counts:
        if n <= 0:
            continue
        p = n / total
        h -= p * math.log(p)
    return round(h, 4)


def bioacoustic_health_score(
    *,
    shannon_index: float,
    unique_species: int,
    avg_confidence: float,
    detections: list[dict[str, Any]],
) -> float:
    """
    Overall biodiversity score 0–100 from Shannon index, species richness,
    AI confidence, and presence of IUCN-listed threatened species.
    """
    shannon_norm = min(shannon_index / 3.0, 1.0)
    species_norm = min(unique_species / 12.0, 1.0)
    confidence_norm = max(0.0, min(avg_confidence, 1.0))

    threatened = sum(
        1 for d in detections if d.get("iucn_status") in _THREATENED
    )
    # Threatened species presence signals conservation value (habitat quality).
    threatened_norm = min(threatened / 2.0, 1.0) if threatened else 0.35

    score = (
        0.35 * shannon_norm
        + 0.30 * species_norm
        + 0.20 * confidence_norm
        + 0.15 * threatened_norm
    ) * 100.0
    return round(max(0.0, min(score, 100.0)), 2)


def aggregate_metrics(detections: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute totals and scores from enriched species detections."""
    if not detections:
        return {
            "total_species_count": 0,
            "total_calls_detected": 0,
            "shannon_diversity_index": 0.0,
            "bioacoustic_health_score": 0.0,
            "ai_confidence_score": 0.0,
        }

    call_counts = [int(d.get("call_count") or 0) for d in detections]
    confidences = [float(d.get("confidence") or 0) for d in detections]
    shannon = shannon_diversity_index(call_counts)
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
    health = bioacoustic_health_score(
        shannon_index=shannon,
        unique_species=len(detections),
        avg_confidence=avg_conf,
        detections=detections,
    )
    return {
        "total_species_count": len(detections),
        "total_calls_detected": sum(call_counts),
        "shannon_diversity_index": shannon,
        "bioacoustic_health_score": health,
        "ai_confidence_score": round(avg_conf, 4),
    }
