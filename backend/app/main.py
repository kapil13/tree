"""BYOT FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import __version__
from app.api.v1 import api_router
from app.api.v1.deps import DB
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.schemas.common import ErrorBody, ErrorResponse, HealthResponse, WorkerHealthResponse

configure_logging()
log = get_logger("byot.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("startup", env=settings.app_env, version=__version__)
    yield
    log.info("shutdown")


app = FastAPI(
    title="BYOT API",
    version=__version__,
    description=(
        "Bring Your Own Tree — register trees, monitor health, "
        "estimate carbon sequestration, and generate verifiable reports."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


# ---------------------------------------------------------------------------
# Error handlers (uniform JSON envelope)
# ---------------------------------------------------------------------------


def _err(code: str, message: str, status_code: int, details=None) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message, details=details))
    return JSONResponse(status_code=status_code, content=body.model_dump(mode="json"))


@app.exception_handler(StarletteHTTPException)
async def http_exc(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail
    code = "http_error"
    if isinstance(detail, str):
        code = detail
        msg = detail.replace("_", " ").capitalize()
    elif isinstance(detail, dict):
        code = str(detail.get("code", "http_error"))
        msg = str(detail.get("message", "Error"))
    else:
        msg = "Error"
    return _err(code, msg, exc.status_code, None)


@app.exception_handler(RequestValidationError)
async def validation_exc(request: Request, exc: RequestValidationError) -> JSONResponse:
    return _err("validation_error", "Request validation failed", status.HTTP_422_UNPROCESSABLE_ENTITY, exc.errors())


# ---------------------------------------------------------------------------
# Health & root
# ---------------------------------------------------------------------------


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
async def integrations_health():
    """External data provider reachability (Open-Meteo, GBIF, Sentinel, etc.)."""
    from app.services.intelligence.integrations import check_all_integrations

    return await check_all_integrations()


@app.get("/", include_in_schema=False)
async def root():
    return {
        "name": "BYOT API",
        "version": __version__,
        "docs": "/docs",
        "openapi": "/openapi.json",
        "health": "/health",
    }


app.include_router(api_router)
