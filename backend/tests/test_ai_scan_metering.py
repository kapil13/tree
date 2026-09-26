"""Tests for BYOT-only AI scan metering."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.services.ai.metering import (
    assert_ai_scan_allowed,
    get_ai_scan_meter_status,
)


def _user(*, role: str = "user") -> MagicMock:
    user = MagicMock()
    user.id = uuid.uuid4()
    user.role = role
    return user


@pytest.mark.asyncio
async def test_professional_enrollment_bypasses_metering(monkeypatch):
    user = _user()
    monkeypatch.setattr(
        "app.services.ai.metering.user_has_professional_enrollment",
        AsyncMock(return_value=True),
    )

    db = MagicMock()
    status = await get_ai_scan_meter_status(db, user)

    assert status.tier == "professional_unlimited"
    assert status.can_scan is True
    assert status.remaining_total is None


@pytest.mark.asyncio
async def test_byot_user_blocked_after_free_limit(monkeypatch):
    user = _user()
    monkeypatch.setattr(
        "app.services.ai.metering.user_has_professional_enrollment",
        AsyncMock(return_value=False),
    )
    monkeypatch.setattr(
        "app.services.ai.metering.count_metered_scans",
        AsyncMock(return_value=5),
    )
    monkeypatch.setattr(
        "app.services.ai.metering.get_purchased_balance",
        AsyncMock(return_value=0),
    )

    db = MagicMock()
    with pytest.raises(HTTPException) as exc:
        await assert_ai_scan_allowed(db, user)

    assert exc.value.status_code == 402
    assert exc.value.detail["code"] == "ai_scan_limit_exceeded"


@pytest.mark.asyncio
async def test_byot_user_with_purchased_balance_can_scan(monkeypatch):
    user = _user()
    monkeypatch.setattr(
        "app.services.ai.metering.user_has_professional_enrollment",
        AsyncMock(return_value=False),
    )
    monkeypatch.setattr(
        "app.services.ai.metering.count_metered_scans",
        AsyncMock(return_value=5),
    )
    monkeypatch.setattr(
        "app.services.ai.metering.get_purchased_balance",
        AsyncMock(return_value=2),
    )

    db = MagicMock()
    status = await assert_ai_scan_allowed(db, user)

    assert status.tier == "byot_metered"
    assert status.can_scan is True
    assert status.remaining_total == 2


@pytest.mark.asyncio
async def test_admin_unlimited(monkeypatch):
    user = _user(role="admin")
    db = MagicMock()
    status = await get_ai_scan_meter_status(db, user)
    assert status.tier == "platform_admin"
    assert status.can_scan is True
