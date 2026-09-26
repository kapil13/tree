"""Paginated sweep job runners."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.monitoring.sweep_jobs import (
    run_satellite_sweep_page,
    run_weekly_sar_integrity_watch_page,
)


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
            "app.services.monitoring.sweep_jobs.try_fence_boundary_geojson",
            return_value={"type": "Polygon", "coordinates": []},
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


@pytest.mark.asyncio
async def test_weekly_integrity_watch_page_chains_when_more_candidates():
    fence_a = MagicMock()
    fence_a.id = uuid.uuid4()
    fence_a.owner_user_id = uuid.uuid4()
    fence_a.project_id = None

    fence_b = MagicMock()
    fence_b.id = uuid.uuid4()
    fence_b.owner_user_id = uuid.uuid4()
    fence_b.project_id = None

    db = AsyncMock()
    rec = MagicMock(provider="sar-nisar")

    with (
        patch(
            "app.services.monitoring.sweep_jobs.fetch_satellite_watch_fences",
            AsyncMock(return_value=[fence_a, fence_b]),
        ),
        patch(
            "app.services.monitoring.sweep_jobs.list_at_risk_fence_ids",
            AsyncMock(return_value=[fence_a.id, fence_b.id]),
        ),
        patch(
            "app.services.monitoring.sweep_jobs.try_fence_boundary_geojson",
            return_value={"type": "Polygon", "coordinates": []},
        ),
        patch(
            "app.services.monitoring.sweep_jobs.build_fence_sar_batch_context",
            AsyncMock(return_value=MagicMock()),
        ),
        patch(
            "app.services.monitoring.sweep_jobs.scan_and_persist_fence_sar",
            AsyncMock(return_value=(rec, MagicMock())),
        ),
        patch(
            "app.services.monitoring.monitoring_read_cache.invalidate_threat_watch_for_owners",
            AsyncMock(),
        ),
    ):
        result = await run_weekly_sar_integrity_watch_page(db, cursor=None, batch_size=1)

    assert result["batch_processed"] == 1
    assert result["scanned"] == 1
    assert result["next_cursor"] is not None
    assert result["provider_mode"] == "live"
