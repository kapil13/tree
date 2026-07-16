"""Biodiversity metrics: Shannon, Simpson, and bioacoustic health score."""

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


def simpson_diversity_index(call_counts: list[int]) -> float:
    """Simpson diversity D = 1 - Σ(pi²). Higher = more diverse."""
    total = sum(call_counts)
    if total <= 0:
        return 0.0
    d = 0.0
    for n in call_counts:
        if n <= 0:
            continue
        p = n / total
        d += p * p
    return round(1.0 - d, 4)


def bioacoustic_health_score(
    *,
    shannon_index: float,
    simpson_index: float,
    unique_species: int,
    avg_confidence: float,
    detections: list[dict[str, Any]],
) -> float:
    """
    Overall biodiversity score 0–100 from Shannon + Simpson diversity,
    species richness, AI confidence, and threatened-species presence.
    """
    shannon_norm = min(shannon_index / 3.0, 1.0)
    simpson_norm = min(simpson_index, 1.0)
    species_norm = min(unique_species / 12.0, 1.0)
    confidence_norm = max(0.0, min(avg_confidence, 1.0))

    threatened = sum(1 for d in detections if d.get("iucn_status") in _THREATENED)
    threatened_norm = min(threatened / 2.0, 1.0) if threatened else 0.35

    score = (
        0.25 * shannon_norm
        + 0.15 * simpson_norm
        + 0.25 * species_norm
        + 0.20 * confidence_norm
        + 0.15 * threatened_norm
    ) * 100.0
    return round(max(0.0, min(score, 100.0)), 2)


def filter_detections_for_metrics(
    detections: list[dict[str, Any]],
    *,
    taxon_groups: set[str] | None = None,
    min_confidence: float | None = None,
) -> list[dict[str, Any]]:
    """Subset detections used for health/diversity scores."""
    out = detections
    if taxon_groups is not None:
        out = [d for d in out if d.get("taxon_group") in taxon_groups]
    if min_confidence is not None:
        out = [d for d in out if float(d.get("confidence") or 0) >= min_confidence]
    return out


def aggregate_metrics(
    detections: list[dict[str, Any]],
    *,
    metric_detections: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Compute totals and scores from enriched species detections."""
    scored = metric_detections if metric_detections is not None else detections

    if not detections:
        return {
            "total_species_count": 0,
            "total_calls_detected": 0,
            "shannon_diversity_index": 0.0,
            "simpson_diversity_index": 0.0,
            "bioacoustic_health_score": 0.0,
            "ai_confidence_score": 0.0,
        }

    call_counts = [int(d.get("call_count") or 0) for d in scored]
    confidences = [float(d.get("confidence") or 0) for d in scored]
    shannon = shannon_diversity_index(call_counts)
    simpson = simpson_diversity_index(call_counts)
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
    health = bioacoustic_health_score(
        shannon_index=shannon,
        simpson_index=simpson,
        unique_species=len(scored),
        avg_confidence=avg_conf,
        detections=scored,
    )
    return {
        "total_species_count": len(detections),
        "total_calls_detected": sum(int(d.get("call_count") or 0) for d in detections),
        "shannon_diversity_index": shannon,
        "simpson_diversity_index": simpson,
        "bioacoustic_health_score": health,
        "ai_confidence_score": round(avg_conf, 4),
    }
