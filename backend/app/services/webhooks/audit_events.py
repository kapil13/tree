"""Estate Watch audit webhook dispatch."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.webhooks.dispatcher import enqueue_webhook_event


async def emit_audit_webhook(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID | None,
    event_type: str,
    payload: dict[str, Any],
) -> list[uuid.UUID]:
    if organization_id is None:
        return []
    return await enqueue_webhook_event(
        db,
        organization_id=organization_id,
        event_type=event_type,
        payload=payload,
    )
