"""Cloudflare Turnstile CAPTCHA verification."""

from __future__ import annotations

import httpx
from fastapi import HTTPException, Request, status

from app.core.config import settings

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def mobile_client_requested(
    request: Request | None,
    *,
    client_platform: str | None = None,
) -> bool:
    """Native Aranyix mobile apps identify via header, body, or Flutter User-Agent."""
    if client_platform and client_platform.strip().lower() == "mobile":
        return True
    if request is None:
        return False
    client = request.headers.get("X-Aranyix-Client", "")
    if client.startswith("mobile/"):
        return True
    user_agent = request.headers.get("User-Agent", "")
    return "Dart/" in user_agent or "okhttp" in user_agent.lower()


async def verify_captcha_token(
    token: str | None,
    *,
    remote_ip: str | None = None,
    request: Request | None = None,
    client_platform: str | None = None,
) -> None:
    """Validate Turnstile token when CAPTCHA is enabled in settings."""
    if not settings.captcha_enabled:
        return
    # Turnstile is unreliable inside Android/iOS WebViews; mobile relies on login rate limits.
    if mobile_client_requested(request, client_platform=client_platform):
        return
    if not token or not token.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="captcha_required")

    payload: dict[str, str] = {
        "secret": settings.turnstile_secret_key or "",
        "response": token.strip(),
    }
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(TURNSTILE_VERIFY_URL, data=payload)
            res.raise_for_status()
            data = res.json()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="captcha_verification_unavailable",
        ) from exc

    if not data.get("success"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="captcha_failed")
