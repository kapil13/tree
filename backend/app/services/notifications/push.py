"""Firebase Cloud Messaging push delivery."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("push")


@dataclass
class PushResult:
    delivered: bool
    info: str | None = None
    message_id: str | None = None


async def send_fcm_push(
    *,
    push_token: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> PushResult:
    """Send a push notification via FCM legacy HTTP API."""
    if not settings.fcm_server_key:
        log.info("push.dev_stub", token=_redact_token(push_token), title=title)
        return PushResult(delivered=True, info="dev_stub")

    payload: dict[str, Any] = {
        "to": push_token,
        "notification": {"title": title, "body": body},
        "priority": "high",
    }
    if data:
        payload["data"] = {k: str(v) for k, v in data.items()}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://fcm.googleapis.com/fcm/send",
                headers={
                    "Authorization": f"key={settings.fcm_server_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        if resp.status_code != 200:
            return PushResult(delivered=False, info=f"http_{resp.status_code}")
        body_json = resp.json()
        if body_json.get("failure", 0) > 0:
            err = (body_json.get("results") or [{}])[0].get("error", "fcm_failure")
            return PushResult(delivered=False, info=str(err))
        msg_id = (body_json.get("results") or [{}])[0].get("message_id")
        return PushResult(delivered=True, message_id=msg_id)
    except Exception as exc:
        log.warning("push.send_failed", error=str(exc))
        return PushResult(delivered=False, info=str(exc))


def send_fcm_push_sync(
    *,
    push_token: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> PushResult:
    return asyncio.get_event_loop().run_until_complete(
        send_fcm_push(push_token=push_token, title=title, body=body, data=data)
    )


def _redact_token(token: str) -> str:
    if len(token) <= 8:
        return "***"
    return f"{token[:4]}…{token[-4:]}"
