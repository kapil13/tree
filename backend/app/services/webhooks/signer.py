"""HMAC-SHA256 signing for outbound webhooks."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any


def sign_payload(secret: str, body: bytes, timestamp: int | None = None) -> tuple[str, int]:
    """Return (signature_header_value, unix_timestamp)."""
    ts = int(time.time()) if timestamp is None else timestamp
    signed = f"{ts}.".encode() + body
    digest = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return f"sha256={digest}", ts


def dumps_payload(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
