"""Simple Redis token-bucket rate limiter (FastAPI dependency)."""

from __future__ import annotations

import time
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

try:
    import redis.asyncio as redis_async
except Exception:  # pragma: no cover
    redis_async = None  # type: ignore[assignment]

from app.core.config import settings
from app.core.production_guards import is_hardened_env

_redis = None


async def _client():
    global _redis
    if _redis is None and redis_async is not None:
        _redis = redis_async.from_url(settings.redis_url, decode_responses=True)
    return _redis


def rate_limit(times: int, seconds: int):
    """Returns a FastAPI dependency that enforces N requests per S seconds per IP+route."""

    async def dependency(request: Request) -> None:
        try:
            client = await _client()
        except Exception:
            client = None

        if client is None:
            # Fail closed in staging/production so auth cannot be brute-forced without Redis.
            if is_hardened_env():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail={
                        "code": "rate_limit_unavailable",
                        "message": "Rate limiting temporarily unavailable",
                    },
                )
            return

        ip = request.client.host if request.client else "anon"
        key = f"rl:{ip}:{request.url.path}:{int(time.time() // seconds)}"
        try:
            count = await client.incr(key)
            if count == 1:
                await client.expire(key, seconds)
        except Exception:
            if is_hardened_env():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail={
                        "code": "rate_limit_unavailable",
                        "message": "Rate limiting temporarily unavailable",
                    },
                ) from None
            return

        if count > times:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={"code": "rate_limited", "message": "Too many requests"},
            )

    return Depends(dependency)


RateLimit = Annotated[None, "rate_limit"]
