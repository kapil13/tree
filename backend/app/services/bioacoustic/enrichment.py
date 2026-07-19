"""Enrich AI detections with GBIF taxonomy and IUCN conservation status."""

from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.services.bioacoustic.gbif_client import match_species, taxon_group_from_gbif
from app.services.bioacoustic.iucn_api_client import resolve_iucn


def enrich_detection(
    scientific_name: str,
    common_name: str,
    taxon_group: str,
    *,
    confidence: float = 0.0,
    call_count: int = 0,
    time_intervals: list[dict[str, float]] | None = None,
    regional_occurrence_match: bool | None = None,
) -> dict[str, Any]:
    gbif = match_species(scientific_name)
    resolved_group = taxon_group_from_gbif(gbif, fallback=taxon_group or "bird")
    iucn = resolve_iucn(scientific_name)

    canonical_name = gbif.get("scientificName") if gbif else scientific_name
    vernacular = common_name
    if gbif and gbif.get("vernacularName"):
        vernacular = gbif["vernacularName"]

    review_threshold = settings.bioacoustic_review_confidence
    needs_review = confidence < review_threshold

    return {
        "scientific_name": canonical_name,
        "common_name": vernacular,
        "taxon_group": resolved_group,
        "confidence": confidence,
        "call_count": call_count,
        "time_intervals": time_intervals or [],
        "needs_review": needs_review,
        "included_in_richness": not needs_review,
        "is_native": regional_occurrence_match is True,
        "is_invasive": False,
        "gbif_usage_key": gbif.get("usageKey") if gbif else None,
        "gbif_match_type": gbif.get("matchType") if gbif else None,
        "gbif_kingdom": gbif.get("kingdom") if gbif else None,
        "iucn_status": iucn["iucn_status"],
        "population_trend": iucn["population_trend"],
        "threat_status": iucn["threat_status"],
        "iucn_taxon_id": iucn.get("iucn_taxon_id"),
        "iucn_url": iucn.get("iucn_url"),
        "regional_occurrence_match": regional_occurrence_match,
        "metadata_sources": {
            "gbif": bool(gbif),
            "iucn": iucn.get("source"),
        },
    }
