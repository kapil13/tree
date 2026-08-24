"""BYOT FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import __version__
from app.api.v1 import api_router
from app.api.v1.deps import DB, bearer_scheme, get_current_user
from app.core.config import settings
from app.core.http_errors import format_http_exception_detail
from app.core.logging import configure_logging, get_logger
from app.core.production_guards import validate_runtime_settings
from app.schemas.common import (
    ErrorBody,
    ErrorResponse,
    HealthResponse,
    LivenessResponse,
    WorkerHealthResponse,
)

configure_logging()
log = get_logger("byot.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_runtime_settings()
    log.info(
        "startup",
        env=settings.app_env,
        version=__version__,
        api_docs=settings.api_docs_exposed,
        metrics=settings.metrics_exposed,
        allow_dev_otp=settings.allow_dev_otp,
    )
    yield
    log.info("shutdown")


_docs = "/docs" if settings.api_docs_exposed else None
_redoc = "/redoc" if settings.api_docs_exposed else None
_openapi = "/openapi.json" if settings.api_docs_exposed else None

app = FastAPI(
    title="BYOT API",
    version=__version__,
    description=(
        "Bring Your Own Tree — register trees, monitor health, "
        "estimate carbon sequestration, and generate verifiable reports."
    ),
    lifespan=lifespan,
    docs_url=_docs,
    redoc_url=_redoc,
    openapi_url=_openapi,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.metrics_exposed:
    Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
else:
    Instrumentator().instrument(app)


# ---------------------------------------------------------------------------
# Error handlers (uniform JSON envelope)
# ---------------------------------------------------------------------------


def _err(code: str, message: str, status_code: int, details=None) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message, details=details))
    return JSONResponse(status_code=status_code, content=body.model_dump(mode="json"))


@app.exception_handler(StarletteHTTPException)
async def http_exc(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code, msg, details = format_http_exception_detail(exc.detail)
    return _err(code, msg, exc.status_code, details)


@app.exception_handler(RequestValidationError)
async def validation_exc(request: Request, exc: RequestValidationError) -> JSONResponse:
    return _err("validation_error", "Request validation failed", status.HTTP_422_UNPROCESSABLE_ENTITY, exc.errors())


# ---------------------------------------------------------------------------
# Health & root
# ---------------------------------------------------------------------------


@app.get("/health/live", response_model=LivenessResponse, tags=["meta"])
async def health_live() -> LivenessResponse:
    """Liveness probe — no DB; used by Docker healthcheck."""
    return LivenessResponse(status="ok", version=__version__)


@app.get("/health", response_model=HealthResponse, tags=["meta"])
async def health(db: DB) -> HealthResponse:
    db_status = "ok"
    try:
        from sqlalchemy import text

        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"
    return HealthResponse(status="ok", version=__version__, env=settings.app_env, db=db_status)


@app.get("/health/workers", response_model=WorkerHealthResponse, tags=["meta"])
async def worker_health(db: DB) -> WorkerHealthResponse:
    from app.services.monitoring.worker_health import build_worker_health

    return WorkerHealthResponse.model_validate(await build_worker_health(db))


@app.get("/health/integrations", tags=["meta"])
async def integrations_health(
    request: Request,
    db: DB,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    """External data provider reachability. Requires auth in production/staging."""
    if settings.app_env in ("production", "staging"):
        await get_current_user(request, creds, db)
    from app.services.intelligence.integrations import check_all_integrations

    return await check_all_integrations()


@app.get("/", include_in_schema=False)
async def root():
    payload = {
        "name": "BYOT API",
        "version": __version__,
        "health": "/health",
    }
    if settings.api_docs_exposed:
        payload["docs"] = "/docs"
        payload["openapi"] = "/openapi.json"
    return payload


app.include_router(api_router)
