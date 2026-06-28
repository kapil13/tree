"""OTP generation, storage (Redis), and verification."""

from __future__ import annotations

import secrets
from typing import Literal

from app.core.config import settings
from app.core.logging import get_logger
from app.core.redis_client import get_redis

log = get_logger("otp")

Channel = Literal["email", "sms"]
OTP_KEY = "otp:{channel}:{identifier}"
OTP_ATTEMPTS_KEY = "otp_attempts:{channel}:{identifier}"


def generate_code(length: int | None = None) -> str:
    n = length or settings.otp_length
    upper = 10**n
    return str(secrets.randbelow(upper)).zfill(n)


def _otp_key(channel: Channel, identifier: str) -> str:
    return OTP_KEY.format(channel=channel, identifier=identifier.lower())


def _attempts_key(channel: Channel, identifier: str) -> str:
    return OTP_ATTEMPTS_KEY.format(channel=channel, identifier=identifier.lower())


async def store_code(channel: Channel, identifier: str, code: str) -> None:
    client = await get_redis()
    if client is None:
        raise RuntimeError("redis_unavailable")
    ttl = settings.otp_ttl_seconds
    await client.set(_otp_key(channel, identifier), code, ex=ttl)
    await client.delete(_attempts_key(channel, identifier))


async def verify_code(channel: Channel, identifier: str, code: str) -> bool:
    client = await get_redis()
    if client is None:
        raise RuntimeError("redis_unavailable")

    attempts_key = _attempts_key(channel, identifier)
    attempts = await client.incr(attempts_key)
    if attempts == 1:
        await client.expire(attempts_key, settings.otp_ttl_seconds)
    if attempts > settings.otp_max_attempts:
        await client.delete(_otp_key(channel, identifier))
        return False

    stored = await client.get(_otp_key(channel, identifier))
    if stored is None:
        return False

    if not secrets.compare_digest(stored, code.strip()):
        return False

    await client.delete(_otp_key(channel, identifier))
    await client.delete(attempts_key)
    return True


async def clear_code(channel: Channel, identifier: str) -> None:
    client = await get_redis()
    if client is None:
        return
    await client.delete(_otp_key(channel, identifier))
    await client.delete(_attempts_key(channel, identifier))
