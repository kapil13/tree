"""Regional fauna intelligence — GBIF occurrences + IUCN enrichment."""

from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.services.bioacoustic.gbif_occurrence import _normalize_name, fetch_species_near
from app.services.bioacoustic.iucn_api_client import resolve_iucn


def build_regional_fauna(
    latitude: float,
    longitude: float,
    *,
    radius_km: float | None = None,
    taxon_groups: set[str] | None = None,
    limit: int = 40,
) -> dict[str, Any]:
    """
    Species checklist for a GPS point using GBIF open data, enriched with IUCN status.
    This is the API-driven layer the user expects before/after field recordings.
    """
    radius = radius_km or settings.gbif_occurrence_radius_km
    raw = fetch_species_near(latitude, longitude, radius_km=radius, limit=300)

    if taxon_groups:
        raw = [s for s in raw if s.get("taxon_group") in taxon_groups]

    species: list[dict[str, Any]] = []
    for row in raw[:limit]:
        iucn = resolve_iucn(row["scientific_name"])
        species.append(
            {
                "scientific_name": row["scientific_name"],
                "common_name": row["common_name"],
                "taxon_group": row["taxon_group"],
                "gbif_usage_key": row["gbif_usage_key"],
                "occurrence_count": row["occurrence_count"],
                "iucn_status": iucn["iucn_status"],
                "population_trend": iucn["population_trend"],
                "threat_status": iucn["threat_status"],
                "iucn_taxon_id": iucn.get("iucn_taxon_id"),
                "iucn_url": iucn.get("iucn_url"),
                "metadata_sources": {
                    "gbif": "gbif_occurrence",
                    "iucn": iucn.get("source"),
                },
            }
        )

    breakdown: dict[str, int] = {}
    for s in species:
        tg = s["taxon_group"]
        breakdown[tg] = breakdown.get(tg, 0) + 1

    return {
        "latitude": latitude,
        "longitude": longitude,
        "radius_km": radius,
        "provider": "gbif+iucn",
        "species_count": len(species),
        "taxon_breakdown": breakdown,
        "species": species,
        "iucn_live": settings.iucn_api_token is not None,
    }


def annotate_regional_match(
    detections: list[dict[str, Any]],
    latitude: float | None,
    longitude: float | None,
) -> list[dict[str, Any]]:
    """Flag whether each detection matches GBIF regional occurrence data."""
    if latitude is None or longitude is None:
        for d in detections:
            d["regional_occurrence_match"] = None
        return detections

    regional = {
        _normalize_name(s["scientific_name"])
        for s in fetch_species_near(latitude, longitude)
    }

    for d in detections:
        name = _normalize_name(d.get("scientific_name") or "")
        d["regional_occurrence_match"] = name in regional if name else False

    return detections
