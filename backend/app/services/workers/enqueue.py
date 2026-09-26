"""Best-effort Celery enqueue with synchronous fallback."""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger

log = get_logger("workers.enqueue")


def try_enqueue(task: Any, *args: Any, **kwargs: Any) -> str | None:
    """Return Celery task id when the broker accepts the job, else None."""
    try:
        async_result = task.delay(*args, **kwargs)
        return str(async_result.id)
    except Exception as exc:
        log.warning("celery_enqueue_failed", task=getattr(task, "name", str(task)), error=str(exc))
        return None
