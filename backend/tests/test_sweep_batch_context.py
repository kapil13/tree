"""Batch satellite context helpers for sweep jobs."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.services.monitoring.sweep_batch_context import (
    baseline_ndvi_change_from_fence_records,
    latest_sar_record_from_fence_records,
    optical_context_from_fence_records,
    recent_ndvi_values_from_fence_records,
)


def _record(
    *,
    provider: str,
    ndvi_mean: float | None,
    acquired: datetime,
) -> PlantationSatelliteRecord:
    rec = PlantationSatelliteRecord(
        fence_id=uuid.uuid4(),
        provider=provider,
        scene_id="scene-1",
        scene_acquired_at=acquired,
        cloud_cover_pct=5.0,
        ndvi_mean=ndvi_mean,
    )
    return rec


def test_optical_context_skips_sar_provider_rows():
    now = datetime.now(UTC)
    records = [
        _record(provider="sar-nisar", ndvi_mean=0.5, acquired=now),
        _record(provider="sentinel_hub", ndvi_mean=0.72, acquired=now),
    ]
    ctx = optical_context_from_fence_records(records)
    assert ctx is not None
    assert ctx.ndvi_mean == 0.72
    assert ctx.provider == "sentinel_hub"


def test_latest_sar_record_picks_sar_provider():
    now = datetime.now(UTC)
    sar = _record(provider="sar-gee", ndvi_mean=None, acquired=now)
    optical = _record(provider="sentinel_hub", ndvi_mean=0.6, acquired=now)
    picked = latest_sar_record_from_fence_records([optical, sar])
    assert picked is sar


def test_baseline_ndvi_change_uses_prior_samples():
    now = datetime.now(UTC)
    records = [
        _record(provider="sentinel_hub", ndvi_mean=0.8, acquired=now),
        _record(provider="sentinel_hub", ndvi_mean=0.6, acquired=now),
        _record(provider="sentinel_hub", ndvi_mean=0.5, acquired=now),
    ]
    change = baseline_ndvi_change_from_fence_records(records, current_ndvi=0.7)
    assert change == 0.15


def test_recent_ndvi_values_limits_and_filters():
    now = datetime.now(UTC)
    records = [
        _record(provider="sentinel_hub", ndvi_mean=0.9, acquired=now),
        _record(provider="sentinel_hub", ndvi_mean=None, acquired=now),
        _record(provider="sentinel_hub", ndvi_mean=0.7, acquired=now),
        _record(provider="sentinel_hub", ndvi_mean=0.6, acquired=now),
    ]
    values = recent_ndvi_values_from_fence_records(records, limit=2)
    assert values == [0.9, 0.7]
