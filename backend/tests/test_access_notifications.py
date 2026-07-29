"""Tests for program access onboarding notifications."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.planting_programs.access_notifications import (
    notify_admins_new_access_request,
    notify_user_access_request_decision,
    onboarding_pending_url,
    program_access_queue_url,
)


def test_program_access_urls():
    with patch("app.services.planting_programs.access_notifications.settings") as mock_settings:
        mock_settings.app_frontend_url = "https://aranyix.tech"
        assert program_access_queue_url() == "https://aranyix.tech/platform/program-access"
        assert onboarding_pending_url() == "https://aranyix.tech/onboarding/pending"


@pytest.mark.asyncio
async def test_notify_admins_skips_when_gmail_disabled():
    request = MagicMock(
        id=uuid.uuid4(),
        org_profile={"organization_name": "NHAI Regional"},
        user=MagicMock(full_name="Applicant", email="a@example.com"),
        program=MagicMock(name="Government"),
    )
    db = AsyncMock()

    with (
        patch(
            "app.services.planting_programs.access_notifications.list_program_access_notifier_emails",
            new_callable=AsyncMock,
            return_value=["admin@aranyix.tech"],
        ),
        patch(
            "app.services.planting_programs.access_notifications.gmail_program_access_configured",
            return_value=False,
        ),
    ):
        result = await notify_admins_new_access_request(db, request=request)

    assert result["email_sent"] is False
    assert result["admin_count"] == 1


@pytest.mark.asyncio
async def test_notify_admins_sends_when_configured():
    request = MagicMock(
        id=uuid.uuid4(),
        org_profile={"organization_name": "Corp ESG"},
        user=MagicMock(full_name="Applicant", email="a@example.com"),
        program=MagicMock(name="Corporate ESG"),
    )
    db = AsyncMock()

    with (
        patch(
            "app.services.planting_programs.access_notifications.list_program_access_notifier_emails",
            new_callable=AsyncMock,
            return_value=["admin@aranyix.tech"],
        ),
        patch(
            "app.services.planting_programs.access_notifications.gmail_program_access_configured",
            return_value=True,
        ),
        patch(
            "app.services.planting_programs.access_notifications.send_program_access_admin_email",
            new_callable=AsyncMock,
        ) as mock_send,
    ):
        result = await notify_admins_new_access_request(db, request=request)

    assert result["email_sent"] is True
    mock_send.assert_awaited_once()


@pytest.mark.asyncio
async def test_notify_user_decision_skips_when_gmail_disabled():
    request = MagicMock(
        id=uuid.uuid4(),
        admin_note="Need more documentation",
        user=MagicMock(full_name="Applicant", email="a@example.com"),
        program=MagicMock(name="NGO"),
    )

    with patch(
        "app.services.planting_programs.access_notifications.gmail_program_access_configured",
        return_value=False,
    ):
        result = await notify_user_access_request_decision(request=request, action="reject")

    assert result["email_sent"] is False


@pytest.mark.asyncio
async def test_notify_user_decision_sends_when_configured():
    request = MagicMock(
        id=uuid.uuid4(),
        admin_note=None,
        user=MagicMock(full_name="Applicant", email="a@example.com"),
        program=MagicMock(name="NGO"),
    )

    with (
        patch(
            "app.services.planting_programs.access_notifications.gmail_program_access_configured",
            return_value=True,
        ),
        patch(
            "app.services.planting_programs.access_notifications.send_program_access_decision_email",
            new_callable=AsyncMock,
        ) as mock_send,
    ):
        result = await notify_user_access_request_decision(request=request, action="approve")

    assert result["email_sent"] is True
    mock_send.assert_awaited_once()
