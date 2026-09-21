"""Cursor pagination helpers for large portfolio sweep jobs."""

from __future__ import annotations

from typing import TypeVar

T = TypeVar("T")


def decode_cursor(cursor: str | None) -> int:
    if not cursor:
        return 0
    try:
        offset = int(cursor)
    except ValueError:
        return 0
    return max(offset, 0)


def encode_cursor(offset: int) -> str:
    return str(max(offset, 0))


def slice_batch(
    items: list[T],
    cursor: str | None,
    batch_size: int,
) -> tuple[list[T], str | None, int]:
    """Return (batch, next_cursor, start_offset). next_cursor is None when done."""
    if batch_size <= 0:
        return items, None, 0
    start = decode_cursor(cursor)
    batch = items[start : start + batch_size]
    next_start = start + batch_size
    next_cursor = encode_cursor(next_start) if next_start < len(items) else None
    return batch, next_cursor, start
