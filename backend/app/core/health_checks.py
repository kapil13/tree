"""Shared readiness/liveness helpers for HTTP health endpoints."""

from __future__ import annotations

from contextlib import suppress

from fastapi import Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app import __version__
from app.core.config import settings
from app.core.production_guards import is_hardened_env
from app.schemas.common import HealthResponse


async def ping_database(db: AsyncSession) -> str:
    try:
        await db.execute(text("SELECT 1"))
        return "ok"
    except Exception:
        return "error"


async def ping_redis() -> str:
    try:
        import redis.asyncio as redis_async
    except Exception:
        return "error"

    client = None
    try:
        client = redis_async.from_url(settings.redis_url, decode_responses=True)
        await client.ping()
        return "ok"
    except Exception:
        return "error"
    finally:
        if client is not None:
            with suppress(Exception):
                await client.aclose()


async def collect_health(db: AsyncSession) -> HealthResponse:
    db_status = await ping_database(db)
    redis_status = await ping_redis()
    overall = "ok"
    if db_status != "ok" or (is_hardened_env() and redis_status != "ok"):
        overall = "error"
    return HealthResponse(
        status=overall,
        version=__version__,
        env=settings.app_env,
        db=db_status,
        redis=redis_status,
    )


async def require_health_detail_auth(
    request: Request,
    creds: HTTPAuthorizationCredentials | None,
    db: AsyncSession,
) -> None:
    """Worker/integration health probes require auth in production and staging."""
    if settings.app_env not in ("production", "staging"):
        return
    from app.api.v1.deps import get_current_user

    await get_current_user(request, creds, db)


def health_http_status(health: HealthResponse) -> int:
    return status.HTTP_503_SERVICE_UNAVAILABLE if health.status != "ok" else status.HTTP_200_OK
