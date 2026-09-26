"""Phase H — messaging delivery tracking helpers."""

from __future__ import annotations

from app.services.webhooks.retry import next_retry_at


def test_next_retry_at_returns_future_timestamp():
    when = next_retry_at(1)
    assert when is not None
    assert when.tzinfo is not None


def test_next_retry_at_exhausted():
    assert next_retry_at(99) is None
