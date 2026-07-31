"""One-time OAuth state tokens (Redis + in-memory fallback)."""

from __future__ import annotations

import secrets
import time
from contextlib import suppress

from app.core.rate_limit import _client

OAUTH_STATE_TTL_SECONDS = 600

_memory_state: dict[str, float] = {}


def _purge_memory() -> None:
    now = time.time()
    expired = [k for k, exp in _memory_state.items() if exp <= now]
    for key in expired:
        _memory_state.pop(key, None)


async def issue_oauth_state() -> str:
    _purge_memory()
    state = secrets.token_urlsafe(32)
    client = await _client()
    if client is not None:
        try:
            await client.setex(f"oauth_state:{state}", OAUTH_STATE_TTL_SECONDS, "1")
            return state
        except Exception:
            pass
    _memory_state[state] = time.time() + OAUTH_STATE_TTL_SECONDS
    return state


async def consume_oauth_state(state: str) -> bool:
    if not state:
        return False
    client = await _client()
    if client is not None:
        try:
            key = f"oauth_state:{state}"
            stored = await client.get(key)
            if stored:
                await client.delete(key)
                return True
        except Exception:
            pass
    _purge_memory()
    exp = _memory_state.pop(state, None)
    return exp is not None and exp > time.time()
