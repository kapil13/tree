"""Sweep pagination helpers."""

from app.services.monitoring.sweep_pagination import decode_cursor, encode_cursor, slice_batch


def test_slice_batch_first_page():
    items = list(range(10))
    batch, next_cursor, start = slice_batch(items, None, 4)
    assert batch == [0, 1, 2, 3]
    assert next_cursor == "4"
    assert start == 0


def test_slice_batch_last_page():
    items = list(range(10))
    batch, next_cursor, start = slice_batch(items, "8", 4)
    assert batch == [8, 9]
    assert next_cursor is None
    assert start == 8


def test_decode_cursor_invalid():
    assert decode_cursor("bad") == 0
    assert encode_cursor(5) == "5"
