"""Webhook enqueue and delivery orchestration."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.webhook import OrganizationWebhook, WebhookDelivery
from app.services.webhooks.events import audit_action_to_event
from app.services.webhooks.signer import dumps_payload, sign_payload


def _truncate(text: str | None, limit: int = 2000) -> str | None:
    if text is None:
        return None
    return text if len(text) <= limit else text[: limit - 3] + "..."


async def enqueue_webhook_event(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    event_type: str,
    payload: dict[str, Any],
) -> list[uuid.UUID]:
    """Create pending delivery rows and schedule worker tasks."""
    res = await db.execute(
        select(OrganizationWebhook).where(
            OrganizationWebhook.organization_id == organization_id,
            OrganizationWebhook.enabled.is_(True),
        )
    )
    webhooks = list(res.scalars().all())
    delivery_ids: list[uuid.UUID] = []
    envelope = {
        "id": str(uuid.uuid4()),
        "type": event_type,
        "created_at": datetime.now(UTC).isoformat(),
        "data": payload,
    }

    for webhook in webhooks:
        if event_type not in (webhook.events or []):
            continue
        delivery = WebhookDelivery(
            webhook_id=webhook.id,
            event_type=event_type,
            payload=envelope,
            status="pending",
        )
        db.add(delivery)
        await db.flush()
        delivery_ids.append(delivery.id)
        _schedule_delivery(delivery.id)

    return delivery_ids


async def enqueue_audit_webhooks(db: AsyncSession, entry: AuditLog) -> list[uuid.UUID]:
    if entry.organization_id is None:
        return []
    event_type = audit_action_to_event(entry.action)
    if event_type is None:
        return []
    payload = {
        "audit_id": str(entry.id),
        "action": entry.action,
        "resource_type": entry.resource_type,
        "resource_id": str(entry.resource_id) if entry.resource_id else None,
        "diff": entry.diff or {},
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    }
    return await enqueue_webhook_event(
        db,
        organization_id=entry.organization_id,
        event_type=event_type,
        payload=payload,
    )


def _schedule_delivery(delivery_id: uuid.UUID) -> None:
    try:
        from app.workers.tasks import deliver_webhook

        deliver_webhook.delay(str(delivery_id))
    except Exception:
        # Celery unavailable in dev/tests — delivery row remains pending.
        pass


async def deliver_webhook_once(db: AsyncSession, delivery_id: uuid.UUID) -> WebhookDelivery:
    delivery = await db.get(WebhookDelivery, delivery_id)
    if delivery is None:
        raise ValueError("delivery_not_found")

    webhook = await db.get(OrganizationWebhook, delivery.webhook_id)
    if webhook is None or not webhook.enabled:
        delivery.status = "failed"
        delivery.error_message = "webhook_disabled_or_missing"
        return delivery

    body = dumps_payload(delivery.payload)
    signature, timestamp = sign_payload(webhook.signing_secret, body)
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Aranyix-Webhooks/1.0",
        "X-Aranyix-Event": delivery.event_type,
        "X-Aranyix-Timestamp": str(timestamp),
        "X-Aranyix-Signature": signature,
        "X-Aranyix-Delivery-Id": str(delivery.id),
    }

    delivery.attempt_count += 1
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(webhook.url, content=body, headers=headers)
        delivery.response_status = response.status_code
        delivery.response_body = _truncate(response.text)
        if 200 <= response.status_code < 300:
            delivery.status = "delivered"
            delivery.delivered_at = datetime.now(UTC)
            delivery.error_message = None
        else:
            delivery.status = "failed"
            delivery.error_message = f"http_{response.status_code}"
    except Exception as exc:
        delivery.status = "failed"
        delivery.error_message = _truncate(str(exc), 500)

    return delivery


async def deliver_test_webhook(
    db: AsyncSession,
    webhook: OrganizationWebhook,
    *,
    actor_user_id: uuid.UUID | None,
) -> WebhookDelivery:
    envelope = {
        "id": str(uuid.uuid4()),
        "type": "webhook.test",
        "created_at": datetime.now(UTC).isoformat(),
        "data": {
            "message": "Aranyix webhook test event",
            "webhook_id": str(webhook.id),
            "triggered_by": str(actor_user_id) if actor_user_id else None,
        },
    }
    delivery = WebhookDelivery(
        webhook_id=webhook.id,
        event_type="webhook.test",
        payload=envelope,
        status="pending",
    )
    db.add(delivery)
    await db.flush()
    return await deliver_webhook_once(db, delivery.id)
