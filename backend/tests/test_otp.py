"""Tests for OTP generation and verification."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.auth import otp as otp_service


@pytest.mark.asyncio
async def test_store_and_verify_code():
    store: dict[str, str] = {}

    class FakeRedis:
        async def set(self, key: str, value: str, ex: int | None = None) -> None:
            store[key] = value

        async def get(self, key: str) -> str | None:
            return store.get(key)

        async def delete(self, *keys: str) -> int:
            for k in keys:
                store.pop(k, None)
            return len(keys)

        async def incr(self, key: str) -> int:
            store[key] = str(int(store.get(key, "0")) + 1)
            return int(store[key])

        async def expire(self, key: str, seconds: int) -> bool:
            return True

    fake = FakeRedis()
    with patch("app.services.auth.otp.get_redis", AsyncMock(return_value=fake)):
        await otp_service.store_code("email", "user@example.com", "123456")
        assert await otp_service.verify_code("email", "user@example.com", "123456") is True
        assert await otp_service.verify_code("email", "user@example.com", "123456") is False


@pytest.mark.asyncio
async def test_verify_rejects_wrong_code():
    store: dict[str, str] = {}

    class FakeRedis:
        async def set(self, key: str, value: str, ex: int | None = None) -> None:
            store[key] = value

        async def get(self, key: str) -> str | None:
            return store.get(key)

        async def delete(self, *keys: str) -> int:
            for k in keys:
                store.pop(k, None)
            return len(keys)

        async def incr(self, key: str) -> int:
            store[key] = str(int(store.get(key, "0")) + 1)
            return int(store[key])

        async def expire(self, key: str, seconds: int) -> bool:
            return True

    fake = FakeRedis()
    with patch("app.services.auth.otp.get_redis", AsyncMock(return_value=fake)):
        await otp_service.store_code("email", "user@example.com", "654321")
        assert await otp_service.verify_code("email", "user@example.com", "000000") is False


def test_generate_code_length():
    code = otp_service.generate_code(6)
    assert len(code) == 6
    assert code.isdigit()
