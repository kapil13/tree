"""Emissions portfolio summary rollup."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.emissions.portfolio_summary import build_emissions_portfolio_summary


@pytest.mark.asyncio
async def test_portfolio_summary_empty_projects():
    user = MagicMock(organization_id=uuid.uuid4())
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))))

    summary = await build_emissions_portfolio_summary(db, user)
    assert summary["kpis"]["monitored_sites"] == 0
    assert summary["sites"] == []
