"""API versioning policy headers (Sunset) for deprecated routes."""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# path prefix -> RFC 8594 Sunset date (HTTP-date) when route will be removed
SUNSET_ROUTES: dict[str, str] = {
    "/api/v1/auth/register": "Sat, 01 Mar 2027 00:00:00 GMT",
}

API_VERSION_HEADER = "X-API-Version"
API_VERSION = "1"


class ApiVersioningMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        if request.url.path.startswith("/api/"):
            response.headers[API_VERSION_HEADER] = API_VERSION
            for prefix, sunset in SUNSET_ROUTES.items():
                if request.url.path.startswith(prefix):
                    response.headers["Sunset"] = sunset
                    response.headers.setdefault(
                        "Deprecation",
                        "true",
                    )
                    break
        return response
