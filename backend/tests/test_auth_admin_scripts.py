"""Tests for production auth admin scripts."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.planting_programs.onboarding import repair_stale_onboarding_requests


@pytest.mark.asyncio
async def test_repair_stale_onboarding_requests_withdraws_orphan(monkeypatch):
    user_id = uuid.uuid4()
    created_at = datetime(2025, 1, 1, tzinfo=UTC)
    now = datetime(2026, 7, 28, 12, 0, tzinfo=UTC)
    user = MagicMock(organization_id=None, role="user", created_at=created_at)
    program = MagicMock(code="government_nhai")
    request = MagicMock(
        status="pending",
        org_profile=None,
        program=program,
        created_at=now - timedelta(days=1),
    )

    db = MagicMock()
    db.get = AsyncMock(return_value=user)
    db.flush = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = [request]
    db.execute = AsyncMock(return_value=result)

    monkeypatch.setattr(
        "app.services.planting_programs.onboarding.datetime",
        MagicMock(now=MagicMock(return_value=now)),
    )
    monkeypatch.setattr(
        "app.services.planting_programs.onboarding.list_user_program_codes",
        AsyncMock(return_value=["byot"]),
    )

    withdrawn = await repair_stale_onboarding_requests(db, user_id)
    assert withdrawn == 1
    assert request.status == "withdrawn"
    db.flush.assert_awaited_once()
