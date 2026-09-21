"""Monitoring read cache key helpers."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.services.monitoring.monitoring_read_cache import (
    get_cached_threat_watch,
    invalidate_threat_watch_for_owners,
    set_cached_threat_watch,
)


@pytest.mark.asyncio
async def test_threat_watch_cache_round_trip():
    user_id = uuid.uuid4()
    payload = {"generated_at": "2026-01-01T00:00:00+00:00", "summary": {"sites_monitored": 1}}

    with patch(
        "app.services.monitoring.monitoring_read_cache.cache_set",
        new_callable=AsyncMock,
    ) as mock_set:
        await set_cached_threat_watch(user_id, 12, payload)
        mock_set.assert_awaited_once()
        key = mock_set.await_args.args[0]
        assert str(user_id) in key
        assert key.endswith(":12")

    with patch(
        "app.services.monitoring.monitoring_read_cache.cache_get",
        new_callable=AsyncMock,
        return_value=payload,
    ):
        cached = await get_cached_threat_watch(user_id, 12)
        assert cached is not None
        assert cached["cache_hit"] is True
        assert cached["summary"]["sites_monitored"] == 1


@pytest.mark.asyncio
async def test_invalidate_threat_watch_for_owners_deletes_all_limits():
    owner_ids = {uuid.uuid4(), uuid.uuid4()}
    with patch(
        "app.services.monitoring.monitoring_read_cache.cache_delete",
        new_callable=AsyncMock,
    ) as mock_delete:
        await invalidate_threat_watch_for_owners(owner_ids)
    assert mock_delete.await_count == len(owner_ids) * 4
