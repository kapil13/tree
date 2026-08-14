"""RFC 3161 timestamp authority adapter (stub in dev)."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime

from app.core.config import settings


def request_timestamp_token(content_digest_hex: str) -> bytes | None:
    """Return a dev stub token or None when TSA is disabled."""
    if not settings.evidence_tsa_enabled:
        return None
    if settings.evidence_tsa_url:
        # Production hook — integrate real RFC 3161 client when TSA URL is configured.
        return None
    payload = {
        "stub": True,
        "digest_sha256": content_digest_hex,
        "tsa": settings.evidence_tsa_stub_label,
        "issued_at": datetime.now(UTC).isoformat(),
        "token_id": hashlib.sha256(content_digest_hex.encode()).hexdigest()[:32],
    }
    return json.dumps(payload, sort_keys=True).encode()
