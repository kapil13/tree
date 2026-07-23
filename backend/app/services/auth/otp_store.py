"""Redis-backed OTP codes and short-lived signup sessions."""

from __future__ import annotations

import json
import secrets
import time
from contextlib import suppress
from typing import Any

from app.core.config import settings
from app.core.rate_limit import _client
from app.services.auth.otp import DEV_OTP_CODE, verify_dev_otp

SIGNUP_SESSION_TTL_SECONDS = 1800
OTP_TTL_SECONDS = 600

_memory_signup: dict[str, tuple[dict[str, Any], float]] = {}
_memory_otp: dict[str, tuple[str, float]] = {}


def _purge_memory() -> None:
    now = time.time()
    expired_signup = [k for k, (_, exp) in _memory_signup.items() if exp <= now]
    for key in expired_signup:
        _memory_signup.pop(key, None)
    expired_otp = [k for k, (_, exp) in _memory_otp.items() if exp <= now]
    for key in expired_otp:
        _memory_otp.pop(key, None)


def _otp_code() -> str:
    if not settings.auth_otp_sms_enabled:
        return DEV_OTP_CODE
    return f"{secrets.randbelow(1_000_000):06d}"


async def issue_otp(purpose: str, identifier: str) -> str:
    _purge_memory()
    code = _otp_code()
    client = await _client()
    if client is not None:
        try:
            await client.setex(f"otp:{purpose}:{identifier}", OTP_TTL_SECONDS, code)
            return code
        except Exception:
            pass
    _memory_otp[f"{purpose}:{identifier}"] = (code, time.time() + OTP_TTL_SECONDS)
    return code


async def check_otp(purpose: str, identifier: str, code: str) -> bool:
    if verify_dev_otp(code):
        return True
    client = await _client()
    key = f"{purpose}:{identifier}"
    if client is not None:
        try:
            stored = await client.get(f"otp:{purpose}:{identifier}")
            if stored and stored == code.strip():
                await client.delete(f"otp:{purpose}:{identifier}")
                return True
        except Exception:
            pass
    _purge_memory()
    entry = _memory_otp.get(key)
    if entry and entry[0] == code.strip():
        _memory_otp.pop(key, None)
        return True
    return False


async def save_signup_session(token: str, payload: dict[str, Any]) -> None:
    _purge_memory()
    client = await _client()
    if client is not None:
        try:
            await client.setex(
                f"signup:{token}",
                SIGNUP_SESSION_TTL_SECONDS,
                json.dumps(payload),
            )
            return
        except Exception:
            pass
    _memory_signup[token] = (payload, time.time() + SIGNUP_SESSION_TTL_SECONDS)


async def load_signup_session(token: str) -> dict[str, Any] | None:
    _purge_memory()
    client = await _client()
    if client is not None:
        try:
            raw = await client.get(f"signup:{token}")
            if raw:
                return json.loads(raw)
        except Exception:
            pass
    entry = _memory_signup.get(token)
    if entry is None:
        return None
    return entry[0]


async def update_signup_session(token: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    current = await load_signup_session(token)
    if current is None:
        return None
    current.update(updates)
    await save_signup_session(token, current)
    return current


async def delete_signup_session(token: str) -> None:
    client = await _client()
    if client is not None:
        with suppress(Exception):
            await client.delete(f"signup:{token}")
    _memory_signup.pop(token, None)
