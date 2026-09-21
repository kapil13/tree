"""Paginated sweep job runners."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.monitoring.sweep_jobs import run_satellite_sweep_page


@pytest.mark.asyncio
async def test_satellite_sweep_page_processes_single_batch():
    fence = MagicMock()
    fence.id = uuid.uuid4()
    fence.last_satellite_at = None
    fence.owner_user_id = None

    db = AsyncMock()

    with (
        patch(
            "app.services.monitoring.sweep_jobs.fetch_satellite_watch_fences",
            AsyncMock(return_value=[fence]),
        ),
        patch(
            "app.services.monitoring.sweep_jobs.build_fence_satellite_batch_context",
            AsyncMock(return_value=MagicMock()),
        ),
        patch(
            "app.services.monitoring.sweep_jobs.scan_and_persist_work_area",
            AsyncMock(return_value=MagicMock()),
        ),
    ):
        result = await run_satellite_sweep_page(db, cursor=None, batch_size=50)

    assert result["scanned"] == 1
    assert result["batch_processed"] == 1
    assert result["next_cursor"] is None
    db.commit.assert_awaited_once()
