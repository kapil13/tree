"""Refresh-token JTI denylist (Redis with in-memory fallback)."""

from __future__ import annotations

import time
from contextlib import suppress

from app.core.config import settings
from app.core.rate_limit import _client

_PREFIX = "auth:revoked_jti:"
_memory: dict[str, float] = {}


def _purge_memory() -> None:
    now = time.time()
    for key in [k for k, exp in _memory.items() if exp <= now]:
        _memory.pop(key, None)


def _ttl_seconds(expires_at: int | None) -> int:
    if expires_at is None:
        return max(60, settings.refresh_token_expire_days * 86400)
    remaining = int(expires_at) - int(time.time())
    return max(1, remaining)


async def revoke_jti(jti: str, *, expires_at: int | None = None) -> None:
    """Mark a refresh token JTI as revoked until its natural expiry."""
    if not jti:
        return
    ttl = _ttl_seconds(expires_at)
    client = await _client()
    if client is not None:
        with suppress(Exception):
            await client.setex(f"{_PREFIX}{jti}", ttl, "1")
            return
    _purge_memory()
    _memory[jti] = time.time() + ttl


async def is_jti_revoked(jti: str) -> bool:
    if not jti:
        return True
    client = await _client()
    if client is not None:
        with suppress(Exception):
            if await client.get(f"{_PREFIX}{jti}"):
                return True
    _purge_memory()
    return jti in _memory


def clear_memory_denylist() -> None:
    """Test helper — clear in-process denylist entries."""
    _memory.clear()
