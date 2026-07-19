"""Operational health endpoints (also mounted at /health/* on the app root)."""

from __future__ import annotations

from fastapi import APIRouter

from app import __version__
from app.api.v1.deps import DB
from app.core.config import settings
from app.schemas.common import HealthResponse, WorkerHealthResponse

router = APIRouter(prefix="/health", tags=["meta"])


@router.get("", response_model=HealthResponse)
async def api_health() -> HealthResponse:
    return HealthResponse(status="ok", version=__version__, env=settings.app_env)


@router.get("/workers", response_model=WorkerHealthResponse)
async def api_worker_health(db: DB) -> WorkerHealthResponse:
    from app.services.monitoring.worker_health import build_worker_health

    return WorkerHealthResponse.model_validate(await build_worker_health(db))
