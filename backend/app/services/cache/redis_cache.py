"""Lightweight Redis JSON cache (optional — no-op when Redis unavailable)."""

from __future__ import annotations

import json
from contextlib import suppress
from typing import Any

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("cache.redis")

_redis = None


async def _client():
    global _redis
    if _redis is not None:
        return _redis
    try:
        import redis.asyncio as redis_async
    except Exception:
        return None
    try:
        _redis = redis_async.from_url(settings.redis_url, decode_responses=True)
        return _redis
    except Exception as exc:
        log.warning("redis_cache.connect_failed", error=str(exc))
        return None


async def cache_get(key: str) -> dict[str, Any] | None:
    client = await _client()
    if client is None:
        return None
    try:
        raw = await client.get(key)
        if not raw:
            return None
        return json.loads(raw)
    except Exception as exc:
        log.warning("redis_cache.get_failed", key=key, error=str(exc))
        return None


async def cache_set(key: str, value: dict[str, Any], *, ttl_seconds: int) -> bool:
    client = await _client()
    if client is None:
        return False
    try:
        await client.setex(key, ttl_seconds, json.dumps(value, default=str))
        return True
    except Exception as exc:
        log.warning("redis_cache.set_failed", key=key, error=str(exc))
        return False


async def cache_delete(key: str) -> None:
    client = await _client()
    if client is None:
        return
    with suppress(Exception):
        await client.delete(key)
