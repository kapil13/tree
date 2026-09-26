"""Run async coroutines from Celery prefork workers without closing the DB pool loop."""

from __future__ import annotations

import asyncio
from typing import TypeVar

from celery.signals import worker_process_init, worker_process_shutdown

T = TypeVar("T")

_loop: asyncio.AbstractEventLoop | None = None


@worker_process_init.connect
def _init_worker_loop(**_kwargs: object) -> None:
    """One event loop per worker child process (Celery prefork)."""
    global _loop
    _loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_loop)


@worker_process_shutdown.connect
def _shutdown_worker_loop(**_kwargs: object) -> None:
    global _loop
    if _loop is None or _loop.is_closed():
        return

    from app.core.database import engine

    try:
        _loop.run_until_complete(engine.dispose())
    except Exception:
        pass
    finally:
        _loop.close()
        _loop = None
        asyncio.set_event_loop(None)


def run_async(coro: asyncio.coroutines.Coroutine[object, object, T]) -> T:
    """Execute a coroutine on the worker's persistent loop.

    Celery tasks must not call ``asyncio.run()`` repeatedly in the same process:
    SQLAlchemy's async engine keeps connections tied to the first loop, and the
    second call raises ``RuntimeError: Event loop is closed``.
    """
    if _loop is not None and not _loop.is_closed():
        return _loop.run_until_complete(coro)
    return asyncio.run(coro)
