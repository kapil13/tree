"""Tests for alert channel dispatch and urgent email guarantees."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.user import User
from app.services.alerts.service import (
    dispatch_notification_channel_inline,
    ensure_urgent_email_channel,
)
from app.services.notifications.notifier import NotificationResult


def _user(email: str = "owner@example.com") -> User:
    return User(
        id=uuid.uuid4(),
        email=email,
        phone=None,
        full_name="Owner",
        role="corporate",
        is_active=True,
    )


def test_ensure_urgent_email_channel_adds_email_for_critical_severity():
    user = _user()
    channels = ensure_urgent_email_channel(["in_app"], user, severity="critical")
    assert channels == ["in_app", "email"]


def test_ensure_urgent_email_channel_adds_email_for_high_risk_level():
    user = _user()
    channels = ensure_urgent_email_channel(["in_app"], user, risk_level="high")
    assert channels == ["in_app", "email"]


def test_ensure_urgent_email_channel_skips_low_severity_without_email():
    user = _user()
    channels = ensure_urgent_email_channel(["in_app"], user, severity="info")
    assert channels == ["in_app"]


def test_ensure_urgent_email_channel_no_duplicate_email():
    user = _user()
    channels = ensure_urgent_email_channel(["in_app", "email"], user, severity="critical")
    assert channels == ["in_app", "email"]


@pytest.mark.asyncio
async def test_dispatch_notification_channel_inline_sends_email():
    user = _user()
    notifier = MagicMock()
    notifier.send = AsyncMock(
        return_value=NotificationResult(channel="email", delivered=True),
    )

    with patch("app.services.alerts.service.get_notifier", return_value=notifier):
        result = await dispatch_notification_channel_inline(
            None,
            user,
            "email",
            title="NDVI drop",
            message="Sharp vegetation decline detected.",
        )

    assert result == {"delivered": True, "info": None}
    notifier.send.assert_awaited_once_with(
        channel="email",
        to="owner@example.com",
        title="NDVI drop",
        message="Sharp vegetation decline detected.",
    )


def test_send_notification_worker_does_not_requeue_dispatch():
    import asyncio

    from app.workers.tasks import send_notification

    user = _user()
    inline_result = {"delivered": True}

    with (
        patch("app.workers.tasks.run_async", side_effect=lambda coro: asyncio.run(coro)),
        patch("app.core.database.AsyncSessionLocal") as mock_session_local,
        patch(
            "app.services.alerts.service.dispatch_notification_channel_inline",
            new_callable=AsyncMock,
            return_value=inline_result,
        ) as mock_inline,
        patch(
            "app.services.alerts.service.dispatch_alert_channels",
            new_callable=AsyncMock,
        ) as mock_dispatch,
    ):
        session = AsyncMock()
        session.get = AsyncMock(return_value=user)
        mock_session_local.return_value.__aenter__.return_value = session

        result = send_notification.run(
            str(user.id),
            "email",
            "Critical satellite health",
            "NDVI fell sharply.",
        )

    assert result == {"status": "ok", "delivered": {"email": inline_result}}
    mock_inline.assert_awaited_once()
    mock_dispatch.assert_not_awaited()


@pytest.mark.asyncio
async def test_notifier_email_reports_not_configured():
    from app.services.notifications.notifier import Notifier

    notifier = Notifier()
    with patch("app.services.notifications.notifier.resend_configured", return_value=False):
        result = await notifier._send_email("user@example.com", "Alert", "Body")

    assert result.delivered is False
    assert result.info == "email_not_configured"
