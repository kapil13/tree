"""Biodiversity hotspots from repeated acoustic evidence (not single scores)."""

from __future__ import annotations

import math
from collections import defaultdict
from typing import Any

from geoalchemy2.shape import to_shape

from app.models.bioacoustic_recording import BioacousticRecording
from app.services.bioacoustic.detection_tiers import TIER_ACCEPTED
from app.services.bioacoustic.review import DECISION_CONFIRMED, reviews_index


def _recording_point(rec: BioacousticRecording) -> tuple[float, float] | None:
    if rec.location is None:
        return None
    pt = to_shape(rec.location)
    return float(pt.x), float(pt.y)


def _species_in_recording(rec: BioacousticRecording) -> set[str]:
    reviews = reviews_index(list(rec.detection_reviews or []))
    names: set[str] = set()
    run_id = rec.latest_analysis_run_id
    for det in rec.species_detections or []:
        name = det.get("scientific_name")
        if not name:
            continue
        tier = det.get("detection_tier")
        key = (name, str(run_id) if run_id else None)
        review = reviews.get(key)
        if review and review.decision == DECISION_CONFIRMED:
            names.add(name)
            continue
        if tier == TIER_ACCEPTED:
            names.add(name)
    return names


def _grid_key(lon: float, lat: float, cell_deg: float = 0.002) -> tuple[int, int]:
    return (math.floor(lon / cell_deg), math.floor(lat / cell_deg))


def compute_hotspots(
    recordings: list[BioacousticRecording],
    *,
    min_recordings: int = 2,
    cell_deg: float = 0.002,
) -> list[dict[str, Any]]:
    """
    Hotspot = species with repeated independent evidence (≥min_recordings)
    in the same approximate grid cell within a fence.
    """
    species_cells: dict[str, dict[tuple[int, int], list[str]]] = defaultdict(lambda: defaultdict(list))

    for rec in recordings:
        if rec.status != "analyzed":
            continue
        point = _recording_point(rec)
        if point is None:
            continue
        lon, lat = point
        cell = _grid_key(lon, lat, cell_deg)
        for species in _species_in_recording(rec):
            species_cells[species][cell].append(str(rec.id))

    hotspots: list[dict[str, Any]] = []
    for species, cells in species_cells.items():
        for cell, rec_ids in cells.items():
            unique_ids = sorted(set(rec_ids))
            if len(unique_ids) < min_recordings:
                continue
            lon = (cell[0] + 0.5) * cell_deg
            lat = (cell[1] + 0.5) * cell_deg
            hotspots.append(
                {
                    "scientific_name": species,
                    "recording_count": len(unique_ids),
                    "recording_ids": unique_ids,
                    "longitude": round(lon, 6),
                    "latitude": round(lat, 6),
                    "definition": "repeated_independent_evidence",
                }
            )

    hotspots.sort(key=lambda h: (-h["recording_count"], h["scientific_name"]))
    return hotspots
