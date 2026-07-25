"""Tests for Wave 7.1 — live Sentinel NDVI for trees."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.intelligence.integrations import build_integrations_health
from app.services.monitoring.satellite_sweep import (
    _tree_baseline_ndvi_change,
    maybe_alert_tree_ndvi_decline,
)
from app.services.satellite.service import (
    SentinelHubSatelliteService,
    StubSatelliteService,
    get_satellite_service,
    reset_satellite_service,
)


@pytest.fixture(autouse=True)
def _reset_service():
    reset_satellite_service()
    yield
    reset_satellite_service()


@pytest.mark.asyncio
async def test_get_satellite_service_uses_stub_without_credentials(monkeypatch):
    monkeypatch.setattr(
        "app.services.satellite.plantation.has_sentinel_credentials",
        lambda: False,
    )
    sat = get_satellite_service()
    assert isinstance(sat, StubSatelliteService)
    sample = await sat.sample(12.97, 77.59)
    assert sample.provider == "sentinel-2-stub"


@pytest.mark.asyncio
async def test_get_satellite_service_uses_sentinel_when_configured(monkeypatch):
    monkeypatch.setattr(
        "app.services.satellite.plantation.has_sentinel_credentials",
        lambda: True,
    )
    sat = get_satellite_service()
    assert isinstance(sat, SentinelHubSatelliteService)


@pytest.mark.asyncio
async def test_sentinel_service_falls_back_when_no_scene(monkeypatch):
    client = AsyncMock()
    client.fetch_latest_sample = AsyncMock(return_value=None)
    service = SentinelHubSatelliteService(fallback=StubSatelliteService())
    with patch.object(service, "_client", return_value=client):
        sample = await service.sample(12.97, 77.59)
    assert sample.provider == "sentinel-2-stub"


@pytest.mark.asyncio
async def test_sentinel_service_returns_live_sample(monkeypatch):
    ts = datetime(2026, 3, 1, tzinfo=UTC)
    stats = {"mean": 0.62, "min": 0.55, "max": 0.68}
    client = AsyncMock()
    client.fetch_latest_sample = AsyncMock(return_value=(ts, stats))
    service = SentinelHubSatelliteService(fallback=StubSatelliteService())
    with patch.object(service, "_client", return_value=client):
        sample = await service.sample(12.97, 77.59)
    assert sample.provider == "sentinel-2"
    assert sample.ndvi_mean == 0.62
    assert sample.presence_confirmed is True


@pytest.mark.asyncio
async def test_tree_baseline_ndvi_change():
    tree_id = MagicMock()
    rec_old = MagicMock(ndvi_mean=0.7)
    rec_new = MagicMock(ndvi_mean=0.5)
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=lambda: [rec_new, rec_old, rec_old])))
    )
    change = await _tree_baseline_ndvi_change(db, tree_id, 0.5)
    assert change == pytest.approx(-0.2, abs=0.01)


@pytest.mark.asyncio
async def test_maybe_alert_tree_ndvi_decline_creates_alert():
    tree = MagicMock(
        id=MagicMock(),
        public_code="BYOT-001",
        owner_user_id=MagicMock(),
        project_id=None,
    )
    user = MagicMock()
    sample = MagicMock(ndvi_mean=0.35)
    db = AsyncMock()
    with patch(
        "app.services.monitoring.satellite_sweep.create_monitoring_alert",
        new_callable=AsyncMock,
    ) as create_alert:
        await maybe_alert_tree_ndvi_decline(
            db,
            tree=tree,
            user=user,
            sample=sample,
            change=-0.18,
        )
    create_alert.assert_awaited_once()
    assert create_alert.await_args.kwargs["kind"] == "ndvi_degradation"


@pytest.mark.asyncio
async def test_integrations_tree_ndvi_live_when_sentinel_configured():
    with (
        patch(
            "app.services.intelligence.integrations._ping_open_meteo",
            new_callable=AsyncMock,
            return_value={"status": "ok", "reachable": True, "error": None},
        ),
        patch(
            "app.services.intelligence.integrations._ping_gbif",
            new_callable=AsyncMock,
            return_value={"status": "ok", "reachable": True, "error": None},
        ),
        patch("app.services.intelligence.integrations.has_sentinel_credentials", return_value=True),
        patch("app.services.intelligence.integrations.has_bhoonidhi_credentials", return_value=False),
    ):
        result = await build_integrations_health(ping_remote=True)

    tree_ndvi = result["integrations"]["tree_satellite_ndvi"]
    assert tree_ndvi["mode"] == "live"
    assert tree_ndvi["provider"] == "sentinel-2"
