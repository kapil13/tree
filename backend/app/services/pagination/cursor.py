"""Opaque cursor helpers for keyset pagination (created_at + id)."""

from __future__ import annotations

import uuid
from datetime import datetime
from urllib.parse import unquote


class CursorError(ValueError):
    pass


def encode_cursor(*, created_at: datetime, row_id: uuid.UUID) -> str:
    return f"{created_at.isoformat()}|{row_id}"


def decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    raw = unquote((cursor or "").strip())
    if "|" not in raw:
        raise CursorError("invalid_cursor")
    ts, uid = raw.split("|", 1)
    try:
        return datetime.fromisoformat(ts), uuid.UUID(uid)
    except (ValueError, TypeError) as exc:
        raise CursorError("invalid_cursor") from exc
