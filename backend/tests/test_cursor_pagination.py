"""Cursor pagination and MVT scope helpers."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest

from app.services.pagination.cursor import CursorError, decode_cursor, encode_cursor


def test_encode_decode_cursor_roundtrip() -> None:
    row_id = uuid.uuid4()
    created = datetime(2026, 7, 31, 12, 0, 0, tzinfo=UTC)
    token = encode_cursor(created_at=created, row_id=row_id)
    decoded_at, decoded_id = decode_cursor(token)
    assert decoded_id == row_id
    assert decoded_at == created


def test_decode_cursor_rejects_garbage() -> None:
    with pytest.raises(CursorError):
        decode_cursor("not-a-valid-cursor")
