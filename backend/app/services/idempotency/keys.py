"""Redis-backed Idempotency-Key support for mutating API routes."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from fastapi import HTTPException, Request, status

from app.core.config import settings

IDEMPOTENCY_HEADER = "Idempotency-Key"
IDEMPOTENCY_TTL_SECONDS = 86_400


def _redis_client():
    import redis.asyncio as redis_async

    return redis_async.from_url(settings.redis_url, decode_responses=True)


def payload_fingerprint(payload: Any) -> str:
    encoded = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _cache_key(scope: str, idempotency_key: str) -> str:
    return f"idempotency:{scope}:{idempotency_key}"


async def resolve_idempotency(
    request: Request,
    *,
    scope: str,
    payload_fingerprint: str,
) -> dict[str, Any] | None:
    """Return a cached JSON response when the same key and payload were replayed."""
    key = (request.headers.get(IDEMPOTENCY_HEADER) or "").strip()
    if not key:
        return None
    if len(key) > 128:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_idempotency_key")

    client = _redis_client()
    try:
        raw = await client.get(_cache_key(scope, key))
        if raw is None:
            return None
        cached = json.loads(raw)
        if cached.get("fingerprint") != payload_fingerprint:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="idempotency_key_reused")
        return cached.get("body")
    finally:
        await client.aclose()


async def store_idempotency(
    request: Request,
    *,
    scope: str,
    payload_fingerprint: str,
    status_code: int,
    body: dict[str, Any],
) -> None:
    key = (request.headers.get(IDEMPOTENCY_HEADER) or "").strip()
    if not key:
        return
    client = _redis_client()
    try:
        await client.setex(
            _cache_key(scope, key),
            IDEMPOTENCY_TTL_SECONDS,
            json.dumps(
                {
                    "fingerprint": payload_fingerprint,
                    "status_code": status_code,
                    "body": body,
                }
            ),
        )
    finally:
        await client.aclose()
