"""Tests for Tier 3 monitoring: scan history merge and watch-gated sweeps."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace

from app.services.monitoring.scan_history import build_fence_scan_history_rows
from app.services.schemes.monitoring import is_satellite_watch_enabled


def _optical_rec(*, fence_id: uuid.UUID, day: int, ndvi: float = 0.62) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid.uuid4(),
        fence_id=fence_id,
        provider="sentinel-hub",
        scene_id=f"NDVI-{day}",
        scene_acquired_at=datetime(2025, 6, day, tzinfo=UTC),
        ndvi_mean=ndvi,
        change_vs_baseline=-0.04,
        cloud_cover_pct=12.0,
        raw_metadata=None,
    )


def _sar_rec(*, fence_id: uuid.UUID, day: int, score: float = 72.0) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid.uuid4(),
        fence_id=fence_id,
        provider="sar-sentinel-hub",
        scene_id=f"SAR-{day}",
        scene_acquired_at=datetime(2025, 6, day, tzinfo=UTC),
        ndvi_mean=None,
        change_vs_baseline=None,
        cloud_cover_pct=0.0,
        raw_metadata={
            "sar_analysis": {
                "ground_status": "stable",
                "risk_level": "low",
            },
            "sar_fusion": {
                "forest_integrity_score": score,
                "integrity_grade": "good",
                "monitoring_mode": "aligned",
            },
        },
    )


def test_scan_history_merges_ndvi_and_sar_same_day():
    fence_id = uuid.uuid4()
    fence = SimpleNamespace(id=fence_id, name="Block A")
    rows = build_fence_scan_history_rows(
        fence,
        [_optical_rec(fence_id=fence_id, day=10), _sar_rec(fence_id=fence_id, day=10)],
    )
    assert len(rows) == 1
    row = rows[0]
    assert row.ndvi_mean == 0.62
    assert row.forest_integrity_score == 72.0
    assert row.integrity_grade == "good"
    assert row.sar_monitoring_mode == "aligned"


def test_scan_history_separate_days():
    fence_id = uuid.uuid4()
    fence = SimpleNamespace(id=fence_id, name="Block A")
    rows = build_fence_scan_history_rows(
        fence,
        [_optical_rec(fence_id=fence_id, day=10), _sar_rec(fence_id=fence_id, day=15)],
    )
    assert len(rows) == 2
    by_date = {r.scan_date.day: r for r in rows}
    assert by_date[10].ndvi_mean == 0.62
    assert by_date[10].forest_integrity_score is None
    assert by_date[15].forest_integrity_score == 72.0
    assert by_date[15].ndvi_mean is None


def test_watch_gating_helper_matrix():
    assert is_satellite_watch_enabled(SimpleNamespace(scheme_code="estate_monitoring", metadata_={}))
    assert is_satellite_watch_enabled(
        SimpleNamespace(scheme_code="campa_ca", metadata_={"satellite_watch_enabled": True})
    )
    assert not is_satellite_watch_enabled(SimpleNamespace(scheme_code="campa_ca", metadata_={}))
