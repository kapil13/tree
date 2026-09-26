"""GBIF occurrence search — regional species checklist from open data."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.services.bioacoustic.gbif_client import match_species, taxon_group_from_gbif

log = get_logger("bioacoustic.gbif_occurrence")


def _normalize_name(name: str) -> str:
    return name.lower().strip().split("(")[0].strip()


@lru_cache(maxsize=256)
def fetch_species_near(
    latitude: float,
    longitude: float,
    *,
    radius_km: float | None = None,
    limit: int = 300,
) -> list[dict[str, Any]]:
    """
    Return distinct species with occurrence counts near a point (GBIF open API).
    Radius is in kilometres; GBIF expects metres.
    """
    radius_m = int((radius_km or settings.gbif_occurrence_radius_km) * 1000)
    url = f"{settings.gbif_api_url.rstrip('/')}/occurrence/search"
    params = {
        "decimalLatitude": latitude,
        "decimalLongitude": longitude,
        "radius": radius_m,
        "hasCoordinate": "true",
        "limit": min(limit, 300),
    }

    try:
        with httpx.Client(timeout=20.0) as client:
            resp = client.get(url, params=params)
            if resp.status_code != 200:
                log.warning("gbif_occurrence_failed", status=resp.status_code)
                return []
            data = resp.json()
    except httpx.HTTPError as exc:
        log.warning("gbif_occurrence_error", error=str(exc))
        return []

    by_key: dict[int, dict[str, Any]] = {}
    for row in data.get("results") or []:
        key = row.get("speciesKey") or row.get("taxonKey")
        sci = row.get("species") or row.get("scientificName")
        if not key or not sci:
            continue
        key = int(key)
        if key not in by_key:
            by_key[key] = {
                "gbif_usage_key": key,
                "scientific_name": sci,
                "common_name": row.get("vernacularName") or sci,
                "taxon_class": row.get("class"),
                "taxon_kingdom": row.get("kingdom"),
                "occurrence_count": 0,
            }
        by_key[key]["occurrence_count"] += 1

    species = sorted(by_key.values(), key=lambda s: s["occurrence_count"], reverse=True)
    for sp in species:
        sp["taxon_group"] = taxon_group_from_gbif(
            {"class": sp.get("taxon_class"), "kingdom": sp.get("taxon_kingdom")},
            fallback="animal",
        )
    return species


def regional_species_names(
    latitude: float,
    longitude: float,
    *,
    radius_km: float | None = None,
) -> set[str]:
    """Normalized scientific names known from GBIF near this coordinate."""
    return {
        _normalize_name(s["scientific_name"])
        for s in fetch_species_near(latitude, longitude, radius_km=radius_km)
    }


def resolve_gbif_name(scientific_name: str) -> dict[str, Any] | None:
    """Species match with occurrence metadata fallback."""
    return match_species(scientific_name)
