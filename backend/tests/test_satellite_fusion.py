"""Tests for Sentinel + Bhoonidhi satellite fusion (Phase 4.3)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.services.intelligence.satellite_fusion import (
    _fusion_status,
    _ndvi_trend,
    _recommended_action,
)


class _Rec:
    def __init__(self, ndvi: float, days_ago: int):
        self.ndvi_mean = ndvi
        self.scene_acquired_at = datetime.now(UTC) - timedelta(days=days_ago)


def test_ndvi_trend_declining():
    records = [_Rec(0.55, 60), _Rec(0.50, 30), _Rec(0.40, 1)]
    assert _ndvi_trend(records) == "declining"


def test_ndvi_trend_stable():
    records = [_Rec(0.50, 60), _Rec(0.51, 30), _Rec(0.52, 1)]
    assert _ndvi_trend(records) == "stable"


def test_fusion_status_aligned():
    sentinel = {"last_scan_at": "2026-01-01T00:00:00Z"}
    bhoonidhi = {"scenes_available": 2}
    assert _fusion_status(sentinel, bhoonidhi) == "aligned"


def test_fusion_status_sentinel_only():
    sentinel = {"last_scan_at": "2026-01-01T00:00:00Z"}
    bhoonidhi = {"scenes_available": 0}
    assert _fusion_status(sentinel, bhoonidhi) == "sentinel_only"


def test_recommended_action_stale_scan():
    action = _recommended_action(
        fusion_status="aligned",
        days_since_scan=40,
        ndvi_trend="stable",
        scenes_available=2,
    )
    assert "stale" in action.lower()


def test_recommended_action_none():
    action = _recommended_action(
        fusion_status="none",
        days_since_scan=None,
        ndvi_trend="unknown",
        scenes_available=0,
    )
    assert "boundary" in action.lower() or "configure" in action.lower()
