"""Phase H — webhook retry schedule and dead-letter handling."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.webhook import WebhookDelivery
from app.services.webhooks.dispatcher import deliver_webhook_once
from app.services.webhooks.retry import (
    MAX_WEBHOOK_ATTEMPTS,
    retry_delay_seconds,
)


def test_retry_delay_schedule():
    assert retry_delay_seconds(0) == 60
    assert retry_delay_seconds(1) == 60
    assert retry_delay_seconds(2) == 300
    assert retry_delay_seconds(5) == 86400
    assert retry_delay_seconds(6) is None


def test_max_attempts_includes_initial_try():
    assert MAX_WEBHOOK_ATTEMPTS == 6


@pytest.mark.asyncio
async def test_deliver_webhook_schedules_retry_on_http_error():
    delivery = WebhookDelivery(
        webhook_id=uuid.uuid4(),
        event_type="tree.created",
        payload={"id": "x", "type": "tree.created", "data": {}},
        status="pending",
        attempt_count=0,
    )
    webhook = MagicMock()
    webhook.enabled = True
    webhook.signing_secret = "secret"
    webhook.url = "https://example.com/hook"

    db = AsyncMock()
    db.get = AsyncMock(side_effect=[delivery, webhook])

    response = MagicMock()
    response.status_code = 500
    response.text = "error"

    with (
        patch("app.services.webhooks.dispatcher.httpx.AsyncClient") as client_cls,
        patch("app.services.webhooks.dispatcher.schedule_webhook_delivery") as schedule,
        patch("app.services.webhooks.dispatcher.observe_webhook_delivery"),
    ):
        client = AsyncMock()
        client.__aenter__.return_value = client
        client.post = AsyncMock(return_value=response)
        client_cls.return_value = client

        result = await deliver_webhook_once(db, delivery.id)

    assert result.status == "retrying"
    assert result.next_retry_at is not None
    schedule.assert_called_once()


@pytest.mark.asyncio
async def test_deliver_webhook_dead_letters_after_max_attempts():
    delivery = WebhookDelivery(
        webhook_id=uuid.uuid4(),
        event_type="tree.created",
        payload={"id": "x", "type": "tree.created", "data": {}},
        status="retrying",
        attempt_count=MAX_WEBHOOK_ATTEMPTS - 1,
    )
    webhook = MagicMock()
    webhook.enabled = True
    webhook.signing_secret = "secret"
    webhook.url = "https://example.com/hook"

    db = AsyncMock()
    db.get = AsyncMock(side_effect=[delivery, webhook])

    response = MagicMock()
    response.status_code = 500
    response.text = "error"

    with (
        patch("app.services.webhooks.dispatcher.httpx.AsyncClient") as client_cls,
        patch("app.services.webhooks.dispatcher.schedule_webhook_delivery") as schedule,
        patch("app.services.webhooks.dispatcher.observe_webhook_delivery"),
    ):
        client = AsyncMock()
        client.__aenter__.return_value = client
        client.post = AsyncMock(return_value=response)
        client_cls.return_value = client

        result = await deliver_webhook_once(db, delivery.id)

    assert result.status == "dead_letter"
    assert result.dead_lettered_at is not None
    schedule.assert_not_called()
