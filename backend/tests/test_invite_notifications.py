"""Tests for org invite notification delivery stubs."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.organizations.invite_notifications import notify_org_invite


@pytest.mark.asyncio
async def test_notify_org_invite_returns_link_when_providers_disabled():
    org = MagicMock(name="NHAI Regional", id=uuid.uuid4())
    invite = MagicMock(
        id=uuid.uuid4(),
        invite_token="abc123token",
        phone="+919876543210",
        email="worker@example.com",
        org_role="worker",
        full_name="Worker One",
    )

    with (
        patch("app.services.organizations.invite_notifications.sms_invites_configured", return_value=False),
        patch("app.services.organizations.invite_notifications.gmail_invite_configured", return_value=False),
        patch("app.services.organizations.invite_notifications.settings") as mock_settings,
    ):
        mock_settings.app_frontend_url = "https://aranyix.tech"
        result = await notify_org_invite(invite=invite, org=org)

    assert result["sms_sent"] is False
    assert result["email_sent"] is False
    assert "invite=abc123token" in result["invite_link"]


@pytest.mark.asyncio
async def test_notify_org_invite_sends_email_when_configured():
    org = MagicMock(name="Corp ESG", id=uuid.uuid4())
    invite = MagicMock(
        id=uuid.uuid4(),
        invite_token="tok",
        phone=None,
        email="manager@corp.in",
        org_role="manager",
        full_name="Manager",
    )

    with (
        patch("app.services.organizations.invite_notifications.sms_invites_configured", return_value=False),
        patch("app.services.organizations.invite_notifications.gmail_invite_configured", return_value=True),
        patch(
            "app.services.organizations.invite_notifications.send_org_invite_email",
            new_callable=AsyncMock,
        ) as mock_email,
        patch("app.services.organizations.invite_notifications.settings") as mock_settings,
    ):
        mock_settings.app_frontend_url = "https://aranyix.tech"
        result = await notify_org_invite(invite=invite, org=org)

    assert result["email_sent"] is True
    mock_email.assert_awaited_once()
