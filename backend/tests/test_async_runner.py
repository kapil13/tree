"""Tests for Celery async runner (event loop reuse)."""

from __future__ import annotations

import asyncio

import pytest

from app.workers import async_runner


@pytest.fixture(autouse=True)
def _reset_worker_loop():
    loop = asyncio.new_event_loop()
    async_runner._loop = loop
    asyncio.set_event_loop(loop)
    yield
    if not loop.is_closed():
        loop.close()
    async_runner._loop = None
    asyncio.set_event_loop(None)


def test_run_async_reuses_loop_across_calls():
    """Two consecutive run_async calls must not raise 'Event loop is closed'."""

    async def tick(value: int) -> int:
        await asyncio.sleep(0)
        return value

    assert async_runner.run_async(tick(1)) == 1
    assert async_runner.run_async(tick(2)) == 2


def test_asyncio_run_twice_closes_loop():
    """Document the failure mode we avoid in Celery workers."""

    async def noop() -> None:
        return None

    asyncio.run(noop())
    with pytest.raises(RuntimeError, match="Event loop is closed"):
        asyncio.get_event_loop().run_until_complete(noop())
