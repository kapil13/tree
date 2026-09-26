"""Resend delivery event webhooks (bounce / complaint suppress list)."""

from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Request, status

from app.api.v1.deps import DB
from app.core.config import settings
from app.services.messaging.delivery_tracking import handle_resend_event

router = APIRouter(prefix="/webhooks/resend", tags=["webhooks"])


def _verify_resend_secret(request: Request) -> None:
    secret = (settings.resend_webhook_secret or "").strip()
    if not secret:
        if settings.app_env in {"development", "test"}:
            return
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="resend_webhook_not_configured")
    auth = request.headers.get("authorization") or ""
    if auth == f"Bearer {secret}":
        return
    if request.headers.get("x-resend-webhook-secret") == secret:
        return
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_webhook_secret")


@router.post("/events")
async def resend_delivery_events(request: Request, db: DB) -> dict[str, str]:
    _verify_resend_secret(request)
    body = await request.body()
    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_json") from exc

    events: list[dict]
    if isinstance(payload, list):
        events = [e for e in payload if isinstance(e, dict)]
    elif isinstance(payload, dict):
        if payload.get("type"):
            events = [payload]
        else:
            data = payload.get("data")
            events = [data] if isinstance(data, dict) else []
    else:
        events = []

    for event in events:
        await handle_resend_event(db, event)
    await db.commit()
    return {"status": "ok"}
