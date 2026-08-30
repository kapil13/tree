"""Thin async client for Bharatlas LGD layer queries (blocks, GPs, villages)."""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)

BHARATLAS_BASE = "https://bharatlas.com/api/v1"
_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_CACHE_TTL_SEC = 6 * 60 * 60  # 6 hours


def _cache_get(key: str) -> list[dict[str, Any]] | None:
    entry = _CACHE.get(key)
    if entry is None:
        return None
    ts, rows = entry
    if time.monotonic() - ts > _CACHE_TTL_SEC:
        _CACHE.pop(key, None)
        return None
    return rows


def _cache_set(key: str, rows: list[dict[str, Any]]) -> None:
    _CACHE[key] = (time.monotonic(), rows)


async def query_layer(
    layer_id: str,
    *,
    params: dict[str, str | int],
    limit: int = 5000,
) -> tuple[list[dict[str, Any]], str | None]:
    """Return rows and optional error hint when upstream is unavailable."""
    cache_key = f"{layer_id}:{sorted(params.items())}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached, None

    query = {k: str(v) for k, v in params.items()}
    query["limit"] = str(min(limit, 5000))
    url = f"{BHARATLAS_BASE}/layers/{layer_id}/query"

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.get(url, params=query)
            if resp.status_code >= 500:
                logger.warning("bharatlas %s returned %s", layer_id, resp.status_code)
                return [], "upstream_unavailable"
            resp.raise_for_status()
            payload = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("bharatlas query failed for %s: %s", layer_id, exc)
        return [], "upstream_unavailable"

    rows = payload.get("data", {}).get("rows") or []
    _cache_set(cache_key, rows)
    return rows, None
