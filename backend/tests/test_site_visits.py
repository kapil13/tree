"""Site visit tracking service."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.analytics.site_visits import get_site_visit_stats, record_site_visit


@pytest.mark.asyncio
async def test_record_site_visit_dedupes_same_path_same_day():
    db = AsyncMock()
    existing_result = MagicMock()
    existing_result.scalar_one_or_none.return_value = uuid.uuid4()
    db.execute = AsyncMock(return_value=existing_result)

    recorded = await record_site_visit(
        db,
        visitor_id="visitor-1",
        path="/",
        ip="203.0.113.1",
        user_agent="test",
        referrer=None,
        locale="en",
    )
    assert recorded is False
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_get_site_visit_stats_returns_counts():
    db = AsyncMock()
    today = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

    async def fake_execute(stmt):
        result = MagicMock()
        sql = str(stmt)
        if "count(distinct" in sql:
            result.scalar_one.return_value = 2
        elif "created_at >=" in sql or "created_at >=" in sql.lower():
            result.scalar_one.return_value = 3
        else:
            result.scalar_one.return_value = 10
        return result

    db.execute = fake_execute
    stats = await get_site_visit_stats(db)
    assert stats["total"] == 10
    assert stats["today"] == 3
    assert stats["unique_today"] == 2
