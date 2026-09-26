"""IUCN Red List API v4 client with offline catalog fallback."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

import httpx

from app.core.config import settings
from app.services.bioacoustic.iucn_catalog import lookup_iucn


@lru_cache(maxsize=512)
def lookup_iucn_api(scientific_name: str) -> dict[str, Any] | None:
    """Fetch IUCN assessment metadata when an API token is configured."""
    token = settings.iucn_api_token
    if not token:
        return None
    name = scientific_name.strip().replace(" ", "%20")
    if not name:
        return None
    base = settings.iucn_api_url.rstrip("/")
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(f"{base}/taxa/scientific_name/{name}", headers=headers)
            if resp.status_code == 404:
                return None
            if resp.status_code != 200:
                return None
            payload = resp.json()
            assessments = payload.get("assessments") or []
            if not assessments:
                return None
            latest = assessments[0]
            red_list = latest.get("red_list_category") or {}
            code = red_list.get("code") or red_list.get("title") or "NE"
            status = _map_iucn_code(code)
            taxon_id = str(payload.get("taxonid") or latest.get("taxonid") or "")
            return {
                "iucn_status": status,
                "population_trend": latest.get("population_trend", {}).get("title", "Unknown"),
                "threat_status": _threat_level(status),
                "iucn_taxon_id": taxon_id or None,
                "iucn_url": f"https://www.iucnredlist.org/species/{taxon_id}" if taxon_id else "https://www.iucnredlist.org",
                "source": "iucn_api",
            }
    except httpx.HTTPError:
        return None


def _map_iucn_code(code: str) -> str:
    mapping = {
        "LC": "Least Concern",
        "NT": "Near Threatened",
        "VU": "Vulnerable",
        "EN": "Endangered",
        "CR": "Critically Endangered",
        "EW": "Extinct in the Wild",
        "EX": "Extinct",
        "DD": "Data Deficient",
        "NE": "Not Evaluated",
    }
    upper = code.upper().strip()
    if upper in mapping:
        return mapping[upper]
    if code in mapping.values():
        return code
    return "Not Evaluated"


def _threat_level(status: str) -> str:
    if status in {"Critically Endangered", "Endangered", "Vulnerable"}:
        return "high"
    if status in {"Near Threatened"}:
        return "moderate"
    if status == "Least Concern":
        return "low"
    return "unknown"


def resolve_iucn(scientific_name: str) -> dict[str, Any]:
    """Live IUCN API when configured, otherwise offline catalog."""
    api_row = lookup_iucn_api(scientific_name)
    if api_row:
        return api_row
    row = lookup_iucn(scientific_name)
    if row:
        return {
            "iucn_status": row.iucn_status,
            "population_trend": row.population_trend,
            "threat_status": row.threat_status,
            "iucn_taxon_id": row.iucn_taxon_id or None,
            "iucn_url": row.iucn_url,
            "source": "iucn_catalog",
        }
    return {
        "iucn_status": "Not Evaluated",
        "population_trend": "Unknown",
        "threat_status": "unknown",
        "iucn_taxon_id": None,
        "iucn_url": "https://www.iucnredlist.org",
        "source": "none",
    }
