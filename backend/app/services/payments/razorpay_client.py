"""Razorpay REST client and signature verification."""

from __future__ import annotations

import hashlib
import hmac
from typing import Any

import httpx

from app.core.config import settings

RAZORPAY_API = "https://api.razorpay.com/v1"


class RazorpayError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        self.status_code = status_code
        super().__init__(message)


def payments_enabled() -> bool:
    return bool(settings.razorpay_key_id and settings.razorpay_key_secret)


def public_key_id() -> str | None:
    return settings.razorpay_key_id or None


def _auth() -> tuple[str, str]:
    if not payments_enabled():
        raise RazorpayError("razorpay_not_configured")
    assert settings.razorpay_key_id and settings.razorpay_key_secret
    return settings.razorpay_key_id, settings.razorpay_key_secret


async def create_order(
    *,
    amount_paise: int,
    currency: str,
    receipt: str,
    notes: dict[str, str] | None = None,
) -> dict[str, Any]:
    payload = {
        "amount": amount_paise,
        "currency": currency,
        "receipt": receipt[:40],
        "notes": notes or {},
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            f"{RAZORPAY_API}/orders",
            json=payload,
            auth=_auth(),
        )
    if res.status_code >= 400:
        try:
            detail = res.json()
        except Exception:
            detail = res.text
        raise RazorpayError(str(detail), status_code=res.status_code)
    return res.json()


def verify_payment_signature(
    *,
    order_id: str,
    payment_id: str,
    signature: str,
) -> bool:
    if not settings.razorpay_key_secret:
        return False
    body = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(
        settings.razorpay_key_secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    secret = settings.razorpay_webhook_secret or settings.razorpay_key_secret
    if not secret:
        return False
    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
