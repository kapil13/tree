"""Biodiversity assessment metrics — Shannon, ecoacoustic indices, health score."""

from __future__ import annotations

import math
from typing import Any

_THREATENED = {"Critically Endangered", "Endangered", "Vulnerable"}
_REVIEW_CONFIDENCE = 0.70


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
    """Simpson diversity D = 1 - Σ(pi²)."""
    total = sum(call_counts)
    if total <= 0:
        return 0.0
    d = sum((n / total) ** 2 for n in call_counts if n > 0)
    return round(1.0 - d, 4)


def species_richness(detections: list[dict[str, Any]], *, min_confidence: float = 0.70) -> int:
    """Count unique species above review confidence threshold."""
    names = {
        d.get("scientific_name")
        for d in detections
        if float(d.get("confidence") or 0) >= min_confidence and d.get("scientific_name")
    }
    return len(names)


def biodiversity_health_score(
    *,
    species_richness: int,
    shannon_index: float,
    threatened_species: int,
    aci_normalized: float,
    native_ratio: float,
) -> float:
    """
    Biodiversity Health Score (0–100) per assessment spec:
    Richness 30%, Shannon 25%, Threatened 20%, ACI 15%, Native ratio 10%.
    """
    richness_norm = min(species_richness / 15.0, 1.0)
    shannon_norm = min(shannon_index / 3.0, 1.0)
    threatened_norm = min(threatened_species / 2.0, 1.0) if threatened_species else 0.15
    aci_norm = min(max(aci_normalized, 0.0), 1.0)
    native_norm = min(max(native_ratio, 0.0), 1.0)

    score = (
        0.30 * richness_norm
        + 0.25 * shannon_norm
        + 0.20 * threatened_norm
        + 0.15 * aci_norm
        + 0.10 * native_norm
    ) * 100.0
    return round(max(0.0, min(score, 100.0)), 2)


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
    review_threshold: float = _REVIEW_CONFIDENCE,
) -> dict[str, Any]:
    """Full biodiversity assessment metrics for dashboards and MRV reports."""
    scored = metric_detections if metric_detections is not None else detections
    eco = ecoacoustic or {}

    if not detections:
        return {
            "species_richness": 0,
            "total_species_count": 0,
            "total_calls_detected": 0,
            "shannon_diversity_index": 0.0,
            "simpson_diversity_index": 0.0,
            "bioacoustic_health_score": 0.0,
            "biodiversity_health_score": 0.0,
            "ai_confidence_score": 0.0,
            "ecoacoustic_indices": eco,
            "review_threshold": review_threshold,
            "species_above_threshold": 0,
        }

    call_counts = [int(d.get("call_count") or 0) for d in scored]
    confidences = [float(d.get("confidence") or 0) for d in scored]
    shannon = shannon_diversity_index(call_counts)
    simpson = simpson_diversity_index(call_counts)
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

    richness = species_richness(detections, min_confidence=review_threshold)
    threatened = sum(1 for d in scored if d.get("iucn_status") in _THREATENED)
    native_matches = sum(1 for d in detections if d.get("regional_occurrence_match") is True)
    native_ratio = native_matches / len(detections) if detections else 0.0

    health = biodiversity_health_score(
        species_richness=richness,
        shannon_index=shannon,
        threatened_species=threatened,
        aci_normalized=float(eco.get("aci_normalized") or 0),
        native_ratio=native_ratio,
    )

    return {
        "species_richness": richness,
        "total_species_count": len(detections),
        "species_above_threshold": richness,
        "total_calls_detected": sum(int(d.get("call_count") or 0) for d in detections),
        "shannon_diversity_index": shannon,
        "simpson_diversity_index": simpson,
        "bioacoustic_health_score": health,
        "biodiversity_health_score": health,
        "ai_confidence_score": round(avg_conf, 4),
        "ecoacoustic_indices": eco,
        "review_threshold": review_threshold,
        "threatened_species_count": threatened,
        "native_species_ratio": round(native_ratio, 4),
    }


# Backward-compatible alias
def aggregate_metrics(
    detections: list[dict[str, Any]],
    *,
    metric_detections: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return aggregate_assessment_metrics(detections, metric_detections=metric_detections)


def bioacoustic_health_score(**kwargs: Any) -> float:
    return biodiversity_health_score(
        species_richness=kwargs.get("unique_species", 0),
        shannon_index=kwargs.get("shannon_index", 0.0),
        threatened_species=sum(
            1 for d in kwargs.get("detections", []) if d.get("iucn_status") in _THREATENED
        ),
        aci_normalized=0.0,
        native_ratio=0.0,
    )
