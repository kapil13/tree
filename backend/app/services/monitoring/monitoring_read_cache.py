"""Redis cache for expensive monitoring read paths (optional — no-op without Redis)."""

from __future__ import annotations

import uuid
from typing import Any

from app.core.config import settings
from app.core.logging import get_logger
from app.services.cache.redis_cache import cache_delete, cache_get, cache_set

log = get_logger("monitoring.read_cache")


def _threat_watch_key(user_id: uuid.UUID, limit: int) -> str:
    return f"monitoring:threat_watch:{user_id}:{limit}"


def _satellite_health_latest_fence_key(fence_id: uuid.UUID) -> str:
    return f"monitoring:sat_health:fence:{fence_id}"


def _satellite_health_latest_tree_key(tree_id: uuid.UUID) -> str:
    return f"monitoring:sat_health:tree:{tree_id}"


def _satellite_health_report_key(
    user_id: uuid.UUID,
    *,
    project_id: uuid.UUID | None,
    financial_year: str | None,
) -> str:
    pid = str(project_id) if project_id else "all"
    fy = financial_year or "all"
    return f"monitoring:sat_health_report:{user_id}:{pid}:{fy}"


async def get_cached_threat_watch(user_id: uuid.UUID, limit: int) -> dict[str, Any] | None:
    cached = await cache_get(_threat_watch_key(user_id, limit))
    if cached:
        cached["cache_hit"] = True
    return cached


async def set_cached_threat_watch(user_id: uuid.UUID, limit: int, payload: dict[str, Any]) -> None:
    body = {k: v for k, v in payload.items() if k != "cache_hit"}
    await cache_set(
        _threat_watch_key(user_id, limit),
        body,
        ttl_seconds=settings.threat_watch_cache_ttl_seconds,
    )


async def invalidate_threat_watch_for_user(user_id: uuid.UUID) -> None:
    for limit in (6, 12, 15, 20):
        await cache_delete(_threat_watch_key(user_id, limit))


async def get_cached_fence_health_latest(fence_id: uuid.UUID) -> dict[str, Any] | None:
    return await cache_get(_satellite_health_latest_fence_key(fence_id))


async def set_cached_fence_health_latest(fence_id: uuid.UUID, payload: dict[str, Any]) -> None:
    await cache_set(
        _satellite_health_latest_fence_key(fence_id),
        payload,
        ttl_seconds=settings.satellite_health_cache_ttl_seconds,
    )


async def invalidate_fence_health_latest(fence_id: uuid.UUID) -> None:
    await cache_delete(_satellite_health_latest_fence_key(fence_id))


async def get_cached_tree_health_latest(tree_id: uuid.UUID) -> dict[str, Any] | None:
    return await cache_get(_satellite_health_latest_tree_key(tree_id))


async def set_cached_tree_health_latest(tree_id: uuid.UUID, payload: dict[str, Any]) -> None:
    await cache_set(
        _satellite_health_latest_tree_key(tree_id),
        payload,
        ttl_seconds=settings.satellite_health_cache_ttl_seconds,
    )


async def invalidate_tree_health_latest(tree_id: uuid.UUID) -> None:
    await cache_delete(_satellite_health_latest_tree_key(tree_id))


async def get_cached_satellite_health_report(
    user_id: uuid.UUID,
    *,
    project_id: uuid.UUID | None,
    financial_year: str | None,
) -> dict[str, Any] | None:
    cached = await cache_get(
        _satellite_health_report_key(user_id, project_id=project_id, financial_year=financial_year)
    )
    if cached:
        cached["cache_hit"] = True
    return cached


async def set_cached_satellite_health_report(
    user_id: uuid.UUID,
    *,
    project_id: uuid.UUID | None,
    financial_year: str | None,
    payload: dict[str, Any],
) -> None:
    body = {k: v for k, v in payload.items() if k != "cache_hit"}
    await cache_set(
        _satellite_health_report_key(user_id, project_id=project_id, financial_year=financial_year),
        body,
        ttl_seconds=settings.satellite_health_cache_ttl_seconds,
    )
