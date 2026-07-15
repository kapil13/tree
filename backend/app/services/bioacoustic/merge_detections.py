"""Merge species detections from multiple acoustic classifiers."""

from __future__ import annotations

from app.services.ai.bioacoustic_types import SpeciesDetection


def merge_species_detections(detections: list[SpeciesDetection]) -> list[SpeciesDetection]:
    """Combine detections by scientific name (sum calls, weighted avg confidence)."""
    grouped: dict[str, dict] = {}
    for det in detections:
        key = det.scientific_name.strip().lower()
        if key not in grouped:
            grouped[key] = {
                "scientific_name": det.scientific_name,
                "common_name": det.common_name,
                "taxon_group": det.taxon_group,
                "confidence_sum": det.confidence * det.call_count,
                "call_count": det.call_count,
            }
        else:
            row = grouped[key]
            row["confidence_sum"] += det.confidence * det.call_count
            row["call_count"] += det.call_count
            if det.confidence > row.get("peak_confidence", 0):
                row["common_name"] = det.common_name
                row["taxon_group"] = det.taxon_group

    merged: list[SpeciesDetection] = []
    for row in grouped.values():
        calls = max(int(row["call_count"]), 1)
        merged.append(
            SpeciesDetection(
                scientific_name=row["scientific_name"],
                common_name=row["common_name"],
                taxon_group=row["taxon_group"],
                confidence=round(row["confidence_sum"] / calls, 4),
                call_count=calls,
            )
        )
    merged.sort(key=lambda d: d.call_count, reverse=True)
    return merged


def taxon_breakdown(detections: list[SpeciesDetection]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for det in detections:
        counts[det.taxon_group] = counts.get(det.taxon_group, 0) + det.call_count
    return counts
