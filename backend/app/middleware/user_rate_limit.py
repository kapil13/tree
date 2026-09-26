"""Global per-user API rate limiting (Platform Foundation E3)."""

from __future__ import annotations

import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.core.production_guards import is_hardened_env
from app.core.rate_limit import _client
from app.core.security import decode_token


class UserRateLimitMiddleware(BaseHTTPMiddleware):
    """Enforce a global per-user token bucket on /api/v1 (default 1000 / 15 min)."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if settings.app_env in {"test", "development"}:
            return await call_next(request)

        path = request.url.path
        if not path.startswith("/api/v1") or path.startswith("/api/v1/health"):
            return await call_next(request)

        subject = self._subject(request)
        window = settings.global_rate_limit_window_seconds
        bucket = int(time.time() // window)
        key = f"rl:user:{subject}:{bucket}"

        try:
            client = await _client()
        except Exception:
            client = None

        if client is None:
            if is_hardened_env():
                return self._error(
                    request,
                    503,
                    "rate_limit_unavailable",
                    "Rate limiting temporarily unavailable",
                )
            return await call_next(request)

        try:
            count = await client.incr(key)
            if count == 1:
                await client.expire(key, window)
        except Exception:
            if is_hardened_env():
                return self._error(
                    request,
                    503,
                    "rate_limit_unavailable",
                    "Rate limiting temporarily unavailable",
                )
            return await call_next(request)

        if count > settings.global_rate_limit_max_requests:
            return self._error(request, 429, "rate_limited", "Too many requests")

        return await call_next(request)

    def _error(self, request: Request, status_code: int, code: str, message: str) -> JSONResponse:
        trace_id = getattr(request.state, "trace_id", None)
        body = {
            "error": {
                "code": code,
                "message": message,
                "details": None,
                "trace_id": trace_id,
            }
        }
        return JSONResponse(status_code=status_code, content=body)

    def _subject(self, request: Request) -> str:
        auth = request.headers.get("authorization") or ""
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
            try:
                payload = decode_token(token)
                sub = payload.get("sub")
                if sub:
                    return f"user:{sub}"
            except ValueError:
                pass
        ip = request.client.host if request.client else "anon"
        return f"ip:{ip}"
