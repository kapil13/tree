"""Webhook delivery retry schedule and dead-letter handling."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

# 1m → 5m → 30m → 2h → 24h (after initial attempt)
WEBHOOK_RETRY_DELAYS_SECONDS = (60, 300, 1800, 7200, 86400)
MAX_WEBHOOK_ATTEMPTS = 1 + len(WEBHOOK_RETRY_DELAYS_SECONDS)


def retry_delay_seconds(attempt_count: int) -> int | None:
    """Return countdown for the next retry, or None when attempts are exhausted."""
    if attempt_count < 1:
        return WEBHOOK_RETRY_DELAYS_SECONDS[0]
    index = attempt_count - 1
    if index >= len(WEBHOOK_RETRY_DELAYS_SECONDS):
        return None
    return WEBHOOK_RETRY_DELAYS_SECONDS[index]


def next_retry_at(attempt_count: int) -> datetime | None:
    delay = retry_delay_seconds(attempt_count)
    if delay is None:
        return None
    return datetime.now(UTC) + timedelta(seconds=delay)


def schedule_webhook_delivery(delivery_id: uuid.UUID, *, countdown: int | None = None) -> None:
    try:
        from app.workers.tasks import deliver_webhook

        if countdown is not None and countdown > 0:
            deliver_webhook.apply_async(args=[str(delivery_id)], countdown=countdown)
        else:
            deliver_webhook.delay(str(delivery_id))
    except Exception:
        pass
