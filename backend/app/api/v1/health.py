"""Operational health endpoints (also mounted at /health/* on the app root)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from fastapi.security import HTTPAuthorizationCredentials

from app import __version__
from app.api.v1.deps import DB, bearer_scheme
from app.core.health_checks import (
    collect_health,
    health_http_status,
    require_health_detail_auth,
)
from app.schemas.common import HealthResponse, LivenessResponse, WorkerHealthResponse

router = APIRouter(prefix="/health", tags=["meta"])


@router.get("/live", response_model=LivenessResponse)
async def api_health_live() -> LivenessResponse:
    return LivenessResponse(status="ok", version=__version__)


@router.get("", response_model=HealthResponse)
async def api_health(db: DB, response: Response) -> HealthResponse:
    health = await collect_health(db)
    response.status_code = health_http_status(health)
    return health


@router.get("/workers", response_model=WorkerHealthResponse)
async def api_worker_health(
    request: Request,
    db: DB,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> WorkerHealthResponse:
    await require_health_detail_auth(request, creds, db)
    from app.services.monitoring.worker_health import build_worker_health

    return WorkerHealthResponse.model_validate(await build_worker_health(db))


@router.get("/integrations")
async def api_integrations_health(
    request: Request,
    db: DB,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    await require_health_detail_auth(request, creds, db)
    from app.services.intelligence.integrations import check_all_integrations

    return await check_all_integrations()
