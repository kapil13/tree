"""GBIF species match API client."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

import httpx

from app.core.config import settings


@lru_cache(maxsize=512)
def match_species(scientific_name: str) -> dict[str, Any] | None:
    """Resolve a scientific name to GBIF usage metadata (cached)."""
    name = scientific_name.strip()
    if not name:
        return None
    url = f"{settings.gbif_api_url.rstrip('/')}/species/match"
    try:
        with httpx.Client(timeout=12.0) as client:
            resp = client.get(url, params={"name": name, "verbose": "true"})
            if resp.status_code != 200:
                return None
            data = resp.json()
            if data.get("matchType") == "NONE":
                return None
            return data
    except httpx.HTTPError:
        return None


def taxon_group_from_gbif(gbif: dict[str, Any] | None, fallback: str = "bird") -> str:
    if not gbif:
        return fallback
    klass = (gbif.get("class") or "").lower()
    if klass == "aves":
        return "bird"
    if klass == "amphibia":
        return "frog"
    if klass in {"insecta", "arachnida"}:
        return "insect"
    if klass == "mammalia":
        return "mammal"
    if klass == "reptilia":
        return "reptile"
    kingdom = (gbif.get("kingdom") or "").lower()
    if kingdom == "animalia":
        return "animal"
    return fallback
