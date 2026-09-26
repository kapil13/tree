"""Tests for SAR sweep health tracking (Phase 3.4)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.monitoring.sar_sweep_health import (
    classify_sar_provider,
    maybe_alert_sweep_health,
    summarize_sweep_counts,
)


def test_classify_sar_provider():
    assert classify_sar_provider("nisar-sar-stub") == "stub"
    assert classify_sar_provider("sar-gee-sentinel-1") == "live"
    assert classify_sar_provider(None) == "failed"
    assert classify_sar_provider("sentinel-2") == "other"


def test_summarize_sweep_counts_all_stub():
    outcome = summarize_sweep_counts(scanned=5, failed=1, stub_scans=5, live_scans=0)
    assert outcome["all_stub"] is True
    assert outcome["degraded"] is True
    assert outcome["stub_ratio"] == 1.0
    assert outcome["total_attempts"] == 6


def test_summarize_sweep_counts_mixed():
    outcome = summarize_sweep_counts(scanned=10, failed=0, stub_scans=3, live_scans=7)
    assert outcome["all_stub"] is False
    assert outcome["degraded"] is False
    assert outcome["stub_ratio"] == 0.3


def test_summarize_sweep_counts_degraded_threshold():
    outcome = summarize_sweep_counts(scanned=4, failed=0, stub_scans=2, live_scans=2)
    assert outcome["degraded"] is True


@pytest.mark.asyncio
async def test_maybe_alert_sweep_health_all_stub():
    created: list[str] = []

    async def _fake_create(db, **kwargs):
        created.append(kwargs["kind"])
        return object()

    with patch(
        "app.services.monitoring.sar_sweep_health.create_monitoring_alert",
        new=AsyncMock(side_effect=_fake_create),
    ):
        alert = await maybe_alert_sweep_health(
            AsyncMock(),
            user=object(),  # type: ignore[arg-type]
            job_name="monthly_sar_sweep",
            outcome=summarize_sweep_counts(scanned=3, failed=0, stub_scans=3, live_scans=0),
        )

    assert alert is not None
    assert "sar_sweep_health" in created


@pytest.mark.asyncio
async def test_maybe_alert_sweep_health_skips_healthy():
    with patch(
        "app.services.monitoring.sar_sweep_health.create_monitoring_alert",
        new=AsyncMock(),
    ) as mock_create:
        alert = await maybe_alert_sweep_health(
            AsyncMock(),
            user=object(),  # type: ignore[arg-type]
            job_name="monthly_sar_sweep",
            outcome=summarize_sweep_counts(scanned=5, failed=0, stub_scans=0, live_scans=5),
        )

    assert alert is None
    mock_create.assert_not_called()
