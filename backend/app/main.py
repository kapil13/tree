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
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.schemas.common import ErrorBody, ErrorResponse, HealthResponse

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
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version=__version__, env=settings.app_env)


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
