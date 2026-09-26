"""Tests for platform satellite health admin panel."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.platform.satellite_health import build_satellite_health_panel


def _rows_result(rows):
    result = MagicMock()
    result.all.return_value = rows
    return result


def _first_result(row):
    result = MagicMock()
    result.first.return_value = row
    return result


@pytest.mark.asyncio
async def test_build_satellite_health_panel_ok(monkeypatch):
    db = AsyncMock()
    monkeypatch.setattr(
        "app.services.platform.satellite_health.datetime",
        MagicMock(now=lambda tz=None: datetime(2026, 1, 31, tzinfo=UTC)),
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.has_sentinel_credentials",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.has_bhoonidhi_credentials",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.has_sar_credentials",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.get_sar_service",
        lambda: MagicMock(name="composite-sar"),
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.live_sar_provider_name",
        lambda: "gee",
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.provider_mode_configured",
        lambda mode: mode in {"gee", "sentinel_hub"},
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.sentinel_hub_sar_configured",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.gee_python_available",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health._initialize_gee",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.settings",
        MagicMock(
            sar_enabled=True,
            sar_provider="gee",
            sar_fallback_provider="sentinel_hub",
            gee_service_account_json='{"type":"service_account"}',
        ),
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.get_recent_job_runs",
        AsyncMock(
            return_value=[
                {
                    "job_name": "monthly_sar_sweep",
                    "status": "ok",
                    "finished_at": "2026-01-30T12:00:00+00:00",
                    "error": None,
                    "result": {"scanned": 4, "failed": 0, "stub_scans": 0, "live_scans": 4},
                },
                {
                    "job_name": "daily_health_roundup",
                    "status": "ok",
                    "finished_at": "2026-01-30T08:00:00+00:00",
                    "error": None,
                    "result": {},
                },
            ],
        ),
    )

    db.execute = AsyncMock(
        side_effect=[
            _rows_result([("sentinel-2", 5), ("nisar-sar-stub", 1)]),
            _rows_result([("sentinel-2", 2)]),
            _first_result(("sentinel-2", datetime(2026, 1, 29, tzinfo=UTC))),
            _first_result(("sar-gee-sentinel1", datetime(2026, 1, 28, tzinfo=UTC))),
        ],
    )

    panel = await build_satellite_health_panel(db)

    assert panel["status"] == "degraded"
    assert panel["providers"]["optical"]["configured"] is True
    assert panel["providers"]["bhoonidhi"]["configured"] is True
    assert panel["providers"]["sar"]["credentials_ready"] is True
    assert panel["scans"]["combined"]["optical_live"] == 7
    assert panel["scans"]["combined"]["sar_stub"] == 1
    assert panel["scans"]["combined"]["sar_live"] == 0
    assert len(panel["recent_jobs"]) == 1
    assert panel["recent_jobs"][0]["live_scans"] == 4
    assert panel["scans"]["since"].startswith("2026-01")


@pytest.mark.asyncio
async def test_build_satellite_health_panel_degraded_without_sar_credentials(monkeypatch):
    db = AsyncMock()
    monkeypatch.setattr(
        "app.services.platform.satellite_health.has_sentinel_credentials",
        lambda: False,
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.has_bhoonidhi_credentials",
        lambda: False,
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.has_sar_credentials",
        lambda: False,
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.get_sar_service",
        lambda: MagicMock(name="stub-sar"),
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.live_sar_provider_name",
        lambda: None,
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.provider_mode_configured",
        lambda mode: False,
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.sentinel_hub_sar_configured",
        lambda: False,
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.gee_python_available",
        lambda: False,
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health._initialize_gee",
        lambda: False,
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.settings",
        MagicMock(
            sar_enabled=True,
            sar_provider="stub",
            sar_fallback_provider="stub",
            gee_service_account_json=None,
        ),
    )
    monkeypatch.setattr(
        "app.services.platform.satellite_health.get_recent_job_runs",
        AsyncMock(return_value=[]),
    )
    db.execute = AsyncMock(
        side_effect=[
            _rows_result([]),
            _rows_result([]),
            _first_result(None),
            _first_result(None),
        ],
    )

    panel = await build_satellite_health_panel(db)

    assert panel["status"] == "degraded"
    assert panel["providers"]["optical"]["mode"] == "stub"
    assert panel["providers"]["bhoonidhi"]["mode"] == "not_configured"
    assert panel["scans"]["combined"]["total"] == 0
