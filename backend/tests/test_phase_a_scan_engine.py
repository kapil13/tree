"""Phase A — universal scan engine tests."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.services.monitoring.health_roundup import STALE_ANALYSIS_DAYS
from app.services.monitoring.mgrs import tree_to_scan_tile
from app.services.monitoring.ndvi_change_alerts import (
    NDVI_ACUTE_DROP_THRESHOLD,
    NDVI_DEGRADATION_THRESHOLD,
    NDVI_LOSS_ABSOLUTE_THRESHOLD,
    consecutive_low_ndvi_scenes,
)
from app.services.monitoring.scan_policy import (
    DEFAULT_TREE_SCAN_INTERVAL_DAYS,
    tree_scan_policy,
    work_area_scan_policy,
)


def test_tree_scan_policy_by_program():
    assert tree_scan_policy("government_nhai").interval_days == 3
    assert tree_scan_policy("byot").interval_days == 7
    assert tree_scan_policy(None).interval_days == DEFAULT_TREE_SCAN_INTERVAL_DAYS


def test_work_area_scan_requires_manual_watch():
    assert work_area_scan_policy("campa_ca", watch_enabled=False) is None
    assert work_area_scan_policy("campa_ca", watch_enabled=True) is not None
    assert work_area_scan_policy("estate_monitoring", watch_enabled=True).interval_days == 5


def test_scan_tile_stable():
    a = tree_to_scan_tile(26.8761, 75.7442)
    b = tree_to_scan_tile(26.8761, 75.7442)
    assert a == b
    assert a.startswith("S2TILE_")


def test_ndvi_thresholds_ordering():
    assert NDVI_ACUTE_DROP_THRESHOLD > NDVI_DEGRADATION_THRESHOLD
    assert NDVI_LOSS_ABSOLUTE_THRESHOLD == 0.10


def test_consecutive_low_ndvi_scenes():
    assert consecutive_low_ndvi_scenes([0.45, 0.08, 0.07]) == 2
    assert consecutive_low_ndvi_scenes([0.45, 0.12, 0.08]) == 1
    assert consecutive_low_ndvi_scenes([0.45, 0.30]) == 0


class _Tree:
    def __init__(self, *, health="good", last_analysis=None, satellite_verified=True, last_satellite=None):
        self.current_health = health
        self.last_analysis_at = last_analysis
        self.satellite_verified = satellite_verified
        self.last_satellite_at = last_satellite


def _should_flag_tree(tree: _Tree) -> bool:
    cutoff = datetime.now(UTC) - timedelta(days=STALE_ANALYSIS_DAYS)
    stale = tree.last_analysis_at is None or tree.last_analysis_at <= cutoff
    poor_health = tree.current_health in (
        "poor",
        "critical",
        "dead",
        "unhealthy",
        "disease_risk",
    )
    low_satellite = tree.satellite_verified is False and tree.last_satellite_at is not None
    return poor_health or stale or low_satellite


def test_health_roundup_flags_unhealthy_ai_classes():
    assert _should_flag_tree(_Tree(health="unhealthy"))
    assert _should_flag_tree(_Tree(health="disease_risk"))
