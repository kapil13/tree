"""Tests for estate monitoring KPI helpers."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from app.services.schemes.kpis import scan_coverage_metrics
from app.services.schemes.monitoring import is_monitoring_scheme


def test_is_monitoring_scheme():
    assert is_monitoring_scheme("estate_monitoring")
    assert not is_monitoring_scheme("campa_ca")
    assert not is_monitoring_scheme(None)


def test_scan_coverage_all_fresh():
    now = datetime(2026, 8, 29, tzinfo=UTC)
    fences = [
        SimpleNamespace(last_satellite_at=now - timedelta(days=10)),
        SimpleNamespace(last_satellite_at=now - timedelta(days=5)),
    ]
    metrics = scan_coverage_metrics(fences, max_days_since_scan=35, now=now)
    assert metrics["work_area_count"] == 2
    assert metrics["scanned_work_areas"] == 2
    assert metrics["scan_coverage_pct"] == 100.0


def test_scan_coverage_partial():
    now = datetime(2026, 8, 29, tzinfo=UTC)
    fences = [
        SimpleNamespace(last_satellite_at=now - timedelta(days=10)),
        SimpleNamespace(last_satellite_at=now - timedelta(days=60)),
        SimpleNamespace(last_satellite_at=None),
    ]
    metrics = scan_coverage_metrics(fences, max_days_since_scan=35, now=now)
    assert metrics["scanned_work_areas"] == 1
    assert metrics["scan_coverage_pct"] == 33.3


def test_scan_coverage_empty():
    metrics = scan_coverage_metrics([], max_days_since_scan=35)
    assert metrics["work_area_count"] == 0
    assert metrics["scan_coverage_pct"] == 0.0
