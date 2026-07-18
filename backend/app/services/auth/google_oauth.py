"""Google OAuth code exchange and profile fetch."""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from app.core.config import settings


@dataclass
class GoogleProfile:
    sub: str
    email: str
    name: str
    picture: str | None = None


def google_authorize_url() -> str:
    if not settings.google_client_id:
        raise RuntimeError("google_oauth_not_configured")
    params = {
        "client_id": settings.google_client_id,
        "response_type": "code",
        "scope": "openid email profile",
        "redirect_uri": settings.google_redirect_uri,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"


async def exchange_google_code(code: str) -> GoogleProfile:
    if not settings.google_client_id or not settings.google_client_secret:
        raise RuntimeError("google_oauth_not_configured")

    token_payload = {
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": settings.google_redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        token_res = await client.post("https://oauth2.googleapis.com/token", data=token_payload)
        token_res.raise_for_status()
        access_token = token_res.json().get("access_token")
        if not access_token:
            raise RuntimeError("google_token_missing")

        profile_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        profile_res.raise_for_status()
        data = profile_res.json()

    email = data.get("email")
    sub = data.get("sub")
    name = data.get("name") or (email.split("@")[0] if email else "Google user")
    if not email or not sub:
        raise RuntimeError("google_profile_incomplete")

    return GoogleProfile(
        sub=sub,
        email=email,
        name=name,
        picture=data.get("picture"),
    )
