"""BYOT FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import __version__
from app.api.v1 import api_router
from app.api.v1.deps import DB, bearer_scheme
from app.core.config import settings
from app.core.health_checks import (
    collect_health,
    health_http_status,
    require_health_detail_auth,
)
from app.core.http_errors import format_http_exception_detail
from app.core.logging import configure_logging, get_logger
from app.core.production_guards import validate_runtime_settings
from app.middleware.trace_id import TraceIdMiddleware
from app.middleware.user_rate_limit import UserRateLimitMiddleware
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


class XRobotsTagMiddleware:
    """Mark every API response non-indexable (api.aranyix.tech is not a website)."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_robots(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers") or [])
                headers.append((b"x-robots-tag", b"noindex, nofollow"))
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_robots)


app.add_middleware(UserRateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Outermost: trace id + robots tag on every response.
app.add_middleware(TraceIdMiddleware)
app.add_middleware(XRobotsTagMiddleware)

if settings.metrics_exposed:
    Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
else:
    Instrumentator().instrument(app)


# ---------------------------------------------------------------------------
# Error handlers (uniform JSON envelope)
# ---------------------------------------------------------------------------


def _err(
    request: Request,
    code: str,
    message: str,
    status_code: int,
    details=None,
) -> JSONResponse:
    trace_id = getattr(request.state, "trace_id", None)
    body = ErrorResponse(
        error=ErrorBody(code=code, message=message, details=details, trace_id=trace_id)
    )
    return JSONResponse(status_code=status_code, content=body.model_dump(mode="json"))


@app.exception_handler(StarletteHTTPException)
async def http_exc(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code, msg, details = format_http_exception_detail(exc.detail)
    return _err(request, code, msg, exc.status_code, details)


@app.exception_handler(RequestValidationError)
async def validation_exc(request: Request, exc: RequestValidationError) -> JSONResponse:
    return _err(
        request,
        "validation_error",
        "Request validation failed",
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        {"errors": exc.errors()},
    )


# ---------------------------------------------------------------------------
# Health & root
# ---------------------------------------------------------------------------


@app.get("/health/live", response_model=LivenessResponse, tags=["meta"])
async def health_live() -> LivenessResponse:
    """Liveness probe — no DB; used by Docker healthcheck."""
    return LivenessResponse(status="ok", version=__version__)


@app.get("/health", response_model=HealthResponse, tags=["meta"])
async def health(db: DB, response: Response) -> HealthResponse:
    health_status = await collect_health(db)
    response.status_code = health_http_status(health_status)
    return health_status


@app.get("/health/workers", response_model=WorkerHealthResponse, tags=["meta"])
async def worker_health(
    request: Request,
    db: DB,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> WorkerHealthResponse:
    await require_health_detail_auth(request, creds, db)
    from app.services.monitoring.worker_health import build_worker_health

    return WorkerHealthResponse.model_validate(await build_worker_health(db))


@app.get("/health/integrations", tags=["meta"])
async def integrations_health(
    request: Request,
    db: DB,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    """External data provider reachability. Requires auth in production/staging."""
    await require_health_detail_auth(request, creds, db)
    from app.services.intelligence.integrations import check_all_integrations

    return await check_all_integrations()


@app.get("/robots.txt", include_in_schema=False)
async def robots_txt() -> Response:
    """Crawlers that only read robots.txt still cannot index the API host."""
    return Response(content="User-agent: *\nDisallow: /\n", media_type="text/plain")


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
