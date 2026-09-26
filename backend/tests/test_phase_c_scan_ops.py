"""Phase C — tile-batched scans and scan ops dashboard tests."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.monitoring.mgrs import tile_centroid, tree_to_scan_tile
from app.services.monitoring.tree_tile_sweep import _group_targets_by_tile


def test_group_targets_by_tile():
    a = SimpleNamespace(scan_tile="S2TILE_2687_7574")
    b = SimpleNamespace(scan_tile="S2TILE_2687_7574")
    c = SimpleNamespace(scan_tile=None)
    grouped = _group_targets_by_tile([a, b, c])
    assert len(grouped["S2TILE_2687_7574"]) == 2
    assert len(grouped["unknown"]) == 1


def test_tile_centroid_roundtrip():
    tile = tree_to_scan_tile(26.8761, 75.7442)
    centroid = tile_centroid(tile)
    assert centroid is not None
    lat, lon = centroid
    assert abs(lat - 26.88) < 0.02
    assert abs(lon - 75.74) < 0.02


@pytest.mark.asyncio
async def test_tile_batch_sweep_reuses_tile_sample():
    target = SimpleNamespace(
        scan_tile="S2TILE_2687_7574",
        organization_id=None,
        owner_user_id=None,
        tree_id=MagicMock(),
        next_due_at=None,
    )
    tree = SimpleNamespace(
        id=target.tree_id,
        status="active",
        owner_user_id=None,
        planting_program=None,
    )
    sample = SimpleNamespace(
        provider="sentinel-2-stub",
        scene_id="S1",
        scene_acquired_at=MagicMock(),
        cloud_cover_pct=5.0,
        ndvi_mean=0.55,
        ndvi_max=0.6,
        ndvi_min=0.5,
        evi_mean=0.4,
        presence_confirmed=True,
        change_vs_baseline=-0.02,
    )

    db = AsyncMock()
    db.commit = AsyncMock()

    target_query = MagicMock()
    target_query.scalars.return_value.all.return_value = [target]
    tree_query = MagicMock()
    tree_query.scalar_one_or_none.return_value = tree
    db.execute = AsyncMock(side_effect=[target_query, tree_query])

    with (
        patch("app.services.monitoring.tree_tile_sweep.settings") as mock_settings,
        patch(
            "app.services.monitoring.tree_tile_sweep._fetch_tile_sample",
            new_callable=AsyncMock,
            return_value=sample,
        ) as fetch_sample,
        patch(
            "app.services.monitoring.tree_tile_sweep.org_may_scan",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch(
            "app.services.monitoring.tree_tile_sweep.scan_and_persist_tree_from_sample",
            new_callable=AsyncMock,
            return_value=MagicMock(),
        ) as persist,
        patch(
            "app.services.monitoring.tree_tile_sweep.mark_target_scanned",
            new_callable=AsyncMock,
        ),
    ):
        mock_settings.monitoring_tree_scan_batch_limit = 10
        mock_settings.monitoring_tile_batch_enabled = True

        from app.services.monitoring.tree_tile_sweep import run_tree_scan_sweep

        result = await run_tree_scan_sweep(db)

    fetch_sample.assert_awaited_once()
    persist.assert_awaited_once()
    assert result["tiles_scanned"] == 1
    assert result["scanned"] == 1
