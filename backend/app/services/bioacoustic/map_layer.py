"""GeoJSON map layer for bioacoustic recordings and fence boundaries."""

from __future__ import annotations

from typing import Any

from geoalchemy2.shape import to_shape

from app.models.bioacoustic_recording import BioacousticRecording
from app.models.plantation_fence import PlantationFence
from app.services.bioacoustic.detection_tiers import tier_counts
from app.services.geo import geography_to_geojson_polygon

_TIER_COLORS = {
    "accepted": "#15803d",
    "probable": "#b45309",
    "review_required": "#b91c1c",
    "mixed": "#78716c",
    "pending": "#a8a29e",
}


def _dominant_tier(detections: list[dict[str, Any]]) -> str:
    if not detections:
        return "pending"
    counts = tier_counts(detections)
    if counts.get("review_required", 0) > 0:
        return "review_required"
    if counts.get("probable", 0) > counts.get("accepted", 0):
        return "probable"
    if counts.get("accepted", 0) > 0:
        return "accepted"
    return "mixed"


def build_map_layer(
    recordings: list[BioacousticRecording],
    fences: list[PlantationFence],
) -> dict[str, Any]:
    features: list[dict[str, Any]] = []

    for fence in fences:
        try:
            geometry = geography_to_geojson_polygon(fence.boundary)
        except Exception:
            continue
        features.append(
            {
                "type": "Feature",
                "geometry": geometry,
                "properties": {
                    "kind": "fence_boundary",
                    "fence_id": str(fence.id),
                    "fence_name": fence.name,
                    "stroke": "#15803d",
                    "fill": "#22c55e33",
                },
            }
        )

    for rec in recordings:
        if rec.location is None:
            continue
        pt = to_shape(rec.location)
        detections = list(rec.species_detections or [])
        tier = _dominant_tier(detections)
        confidence = (
            float(rec.biodiversity_confidence_score or rec.bioacoustic_health_score or 0)
            if rec.status == "analyzed"
            else None
        )
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [float(pt.x), float(pt.y)]},
                "properties": {
                    "kind": "recording",
                    "recording_id": str(rec.id),
                    "status": rec.status,
                    "recorded_at": rec.recorded_at.isoformat() if rec.recorded_at else None,
                    "dominant_tier": tier,
                    "tier_color": _TIER_COLORS.get(tier, _TIER_COLORS["mixed"]),
                    "accepted_species_count": rec.accepted_species_count,
                    "biodiversity_confidence_score": confidence,
                    "plantation_fence_id": str(rec.plantation_fence_id) if rec.plantation_fence_id else None,
                },
            }
        )

    return {"type": "FeatureCollection", "features": features}
