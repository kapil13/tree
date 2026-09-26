"""Tests for SAR dual-provider fallback (Phase 4.7)."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import pytest

from app.services.satellite.sar_service import (
    CompositeSarService,
    StubSarService,
    get_sar_service,
    is_stub_sar_provider,
    reset_sar_service,
)
from app.services.satellite.sar_types import SarSample


def _live_sample(provider: str) -> SarSample:
    return SarSample(
        provider=provider,
        scene_id="LIVE1",
        scene_acquired_at=datetime.now(UTC),
        l_band_hh_db=-10.0,
        s_band_hh_db=-14.0,
        vh_hv_ratio=0.3,
        double_bounce_index=0.2,
        wetland_probability=0.3,
        ground_moisture_index=0.4,
        canopy_ground_mismatch=False,
        frequency_bands=["C"],
        polarimetric_composite=None,
        coherence=0.8,
        pipeline="test",
    )


def test_is_stub_sar_provider():
    assert is_stub_sar_provider("nisar-sar-stub") is True
    assert is_stub_sar_provider("sar-gee-sentinel1") is False


@pytest.mark.asyncio
async def test_composite_uses_fallback_when_primary_fails():
    svc = CompositeSarService("sentinel_hub", "gee")

    with patch(
        "app.services.satellite.sar_service.sample_live_point",
        new=AsyncMock(side_effect=[None, _live_sample("sar-gee-sentinel1")]),
    ):
        sample = await svc.sample_point(28.6, 77.2)

    assert sample.provider == "sar-gee-sentinel1"


@pytest.mark.asyncio
async def test_composite_stub_when_all_live_fail():
    svc = CompositeSarService("sentinel_hub", "gee")
    with patch(
        "app.services.satellite.sar_service.sample_live_point",
        new=AsyncMock(return_value=None),
    ):
        sample = await svc.sample_point(28.6, 77.2)
    assert is_stub_sar_provider(sample.provider)


def test_get_sar_service_uses_composite_when_fallback_configured(monkeypatch):
    from app.core.config import settings

    reset_sar_service()
    monkeypatch.setattr(settings, "sar_provider", "sentinel_hub")
    monkeypatch.setattr(settings, "sar_fallback_provider", "gee")
    svc = get_sar_service()
    assert isinstance(svc, CompositeSarService)
    reset_sar_service()


def test_stub_sar_sample_is_deterministic():
    reset_sar_service()
    svc = StubSarService()
    a = asyncio.run(svc.sample_point(28.7, 77.2))
    b = asyncio.run(svc.sample_point(28.7, 77.2))
    assert a.l_band_hh_db == b.l_band_hh_db
