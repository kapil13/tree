"""Tests for dashboard carbon trajectory."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.user import User
from app.services.dashboard.carbon_series import build_carbon_growth_series


@pytest.mark.asyncio
async def test_carbon_growth_empty_portfolio():
    user = User(id=MagicMock(), role="user", organization_id=None)
    user.id = "00000000-0000-0000-0000-000000000001"

    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(all=lambda: []))

    points = await build_carbon_growth_series(db, user)
    assert len(points) == 6
    assert all(p.value == 0.0 for p in points)


@pytest.mark.asyncio
async def test_carbon_growth_from_planted_trees(monkeypatch):
    user = User(id=MagicMock(), role="user", organization_id=None)
    user.id = "00000000-0000-0000-0000-000000000001"
    tree_id = "00000000-0000-0000-0000-000000000002"

    class FakeResult:
        def __init__(self, rows):
            self._rows = rows

        def all(self):
            return self._rows

        def scalar(self):
            return self._rows[0][0] if self._rows else 0

    calls = {"n": 0}

    async def fake_execute(stmt):
        calls["n"] += 1
        if calls["n"] == 1:
            return FakeResult([(tree_id,)])
        if calls["n"] == 2:
            return FakeResult([])
        return FakeResult([(120.0,)])

    db = AsyncMock()
    db.execute = fake_execute

    points = await build_carbon_growth_series(db, user)
    assert len(points) == 6
    assert points[-1].value == 120.0
