"""Shared async Redis client."""

from __future__ import annotations

try:
    import redis.asyncio as redis_async
except Exception:  # pragma: no cover
    redis_async = None  # type: ignore[assignment]

from app.core.config import settings

_redis = None


async def get_redis():
    global _redis
    if _redis is None and redis_async is not None:
        _redis = redis_async.from_url(settings.redis_url, decode_responses=True)
    return _redis
