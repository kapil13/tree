"""Biodiversity assessment metrics — presence-based diversity and evidence confidence."""

from __future__ import annotations

import math
from typing import Any

from app.services.bioacoustic.confidence import METHODOLOGY_VERSION, biodiversity_confidence_score
from app.services.bioacoustic.detection_tiers import (
    accepted_detections,
    tier_counts,
)

_THREATENED = {"Critically Endangered", "Endangered", "Vulnerable"}


def shannon_diversity_index(presence_weights: list[int]) -> float:
    """H' = -Σ(pi * ln(pi)) over equal species presence weights."""
    total = sum(presence_weights)
    if total <= 0:
        return 0.0
    h = 0.0
    for n in presence_weights:
        if n <= 0:
            continue
        p = n / total
        h -= p * math.log(p)
    return round(h, 4)


def simpson_diversity_index(presence_weights: list[int]) -> float:
    """Simpson diversity D = 1 - Σ(pi²) over equal species presence weights."""
    total = sum(presence_weights)
    if total <= 0:
        return 0.0
    d = sum((n / total) ** 2 for n in presence_weights if n > 0)
    return round(1.0 - d, 4)


def accepted_species_richness(detections: list[dict[str, Any]]) -> int:
    """Unique accepted-tier species."""
    names = {
        d.get("scientific_name")
        for d in accepted_detections(detections)
        if d.get("scientific_name")
    }
    return len(names)


def unique_threatened_accepted(detections: list[dict[str, Any]]) -> int:
    names = {
        d.get("scientific_name")
        for d in accepted_detections(detections)
        if d.get("scientific_name") and d.get("iucn_status") in _THREATENED
    }
    return len(names)


def presence_weights_for_diversity(detections: list[dict[str, Any]]) -> list[int]:
    """One equal weight per accepted species (call counts are not individual animals)."""
    accepted = accepted_detections(detections)
    if not accepted:
        return []
    return [1] * len({d.get("scientific_name") for d in accepted if d.get("scientific_name")})


def filter_detections_for_metrics(
    detections: list[dict[str, Any]],
    *,
    taxon_groups: set[str] | None = None,
    min_confidence: float | None = None,
) -> list[dict[str, Any]]:
    out = detections
    if taxon_groups is not None:
        out = [d for d in out if d.get("taxon_group") in taxon_groups]
    if min_confidence is not None:
        out = [d for d in out if float(d.get("confidence") or 0) >= min_confidence]
    return out


def aggregate_assessment_metrics(
    detections: list[dict[str, Any]],
    *,
    metric_detections: list[dict[str, Any]] | None = None,
    ecoacoustic: dict[str, Any] | None = None,
    duration_seconds: float = 0.0,
    gps_verified: bool = False,
    gps_fallback: bool = False,
    warning_high_noise: bool = False,
) -> dict[str, Any]:
    """Biodiversity assessment metrics for dashboards and MRV reports."""
    eco = ecoacoustic or {}
    counts = tier_counts(detections)
    accepted = accepted_detections(detections)

    if not detections:
        return {
            "accepted_species_count": 0,
            "acoustic_signals_count": 0,
            "probable_species_count": counts.get("probable", 0),
            "review_required_count": counts.get("review_required", 0),
            "total_calls_detected": 0,
            "shannon_diversity_index": 0.0,
            "simpson_diversity_index": 0.0,
            "biodiversity_confidence_score": biodiversity_confidence_score(
                [],
                duration_seconds=duration_seconds,
                gps_verified=gps_verified,
                gps_fallback=gps_fallback,
                warning_high_noise=warning_high_noise,
            ),
            "bioacoustic_health_score": 0.0,
            "biodiversity_health_score": 0.0,
            "ai_confidence_score": 0.0,
            "ecoacoustic_indices": eco,
            "methodology_version": METHODOLOGY_VERSION,
            "tier_counts": counts,
            "threatened_accepted_count": 0,
            # Deprecated aliases
            "species_richness": 0,
            "total_species_count": 0,
            "species_above_threshold": 0,
        }

    presence = presence_weights_for_diversity(detections)
    shannon = shannon_diversity_index(presence)
    simpson = simpson_diversity_index(presence)

    confidences = [float(d.get("confidence") or 0) for d in accepted]
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

    confidence_score = biodiversity_confidence_score(
        detections,
        duration_seconds=duration_seconds,
        gps_verified=gps_verified,
        gps_fallback=gps_fallback,
        warning_high_noise=warning_high_noise,
    )

    return {
        "accepted_species_count": accepted_species_richness(detections),
        "acoustic_signals_count": len(detections),
        "probable_species_count": counts.get("probable", 0),
        "review_required_count": counts.get("review_required", 0),
        "total_calls_detected": sum(int(d.get("call_count") or 0) for d in detections),
        "shannon_diversity_index": shannon,
        "simpson_diversity_index": simpson,
        "biodiversity_confidence_score": confidence_score,
        "bioacoustic_health_score": confidence_score,
        "biodiversity_health_score": confidence_score,
        "ai_confidence_score": round(avg_conf, 4),
        "ecoacoustic_indices": eco,
        "methodology_version": METHODOLOGY_VERSION,
        "tier_counts": counts,
        "threatened_accepted_count": unique_threatened_accepted(detections),
        # Deprecated aliases kept for API compatibility
        "species_richness": accepted_species_richness(detections),
        "total_species_count": accepted_species_richness(detections),
        "species_above_threshold": accepted_species_richness(detections),
    }


# Backward-compatible aliases
def species_richness(detections: list[dict[str, Any]], *, min_confidence: float = 0.70) -> int:
    return accepted_species_richness(detections)


def biodiversity_health_score(**kwargs: Any) -> float:
    detections = kwargs.get("detections") or []
    return biodiversity_confidence_score(
        detections,
        duration_seconds=float(kwargs.get("duration_seconds") or 0),
        gps_verified=bool(kwargs.get("gps_verified")),
        gps_fallback=bool(kwargs.get("gps_fallback")),
        warning_high_noise=bool(kwargs.get("warning_high_noise")),
    )


def aggregate_metrics(
    detections: list[dict[str, Any]],
    *,
    metric_detections: list[dict[str, Any]] | None = None,
    **kwargs: Any,
) -> dict[str, Any]:
    return aggregate_assessment_metrics(detections, metric_detections=metric_detections, **kwargs)


def bioacoustic_health_score(**kwargs: Any) -> float:
    return biodiversity_health_score(**kwargs)
