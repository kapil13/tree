"""Tests for Estate Watch Phase 2 satellite monitoring."""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from app.services.audit_satellite.providers import assert_audit_provider, is_stub_provider
from app.services.audit_satellite.timeline import _assign_phases


def test_is_stub_provider():
    assert is_stub_provider("sentinel-2-stub")
    assert is_stub_provider("nisar-sar-stub")
    assert not is_stub_provider("sentinel-2")


def test_assert_audit_provider_rejects_stub():
    with pytest.raises(ValueError, match="stub_not_allowed"):
        assert_audit_provider("sentinel-2-stub")


def test_assign_phases_t0_and_current():
    planting = datetime(2020, 6, 15, tzinfo=UTC)
    samples = [
        (datetime(2020, 5, 1, tzinfo=UTC), {"mean": 0.35}),
        (datetime(2021, 6, 1, tzinfo=UTC), {"mean": 0.42}),
        (datetime(2022, 6, 1, tzinfo=UTC), {"mean": 0.48}),
        (datetime(2023, 6, 1, tzinfo=UTC), {"mean": 0.52}),
        (datetime(2024, 6, 1, tzinfo=UTC), {"mean": 0.55}),
        (datetime(2025, 6, 1, tzinfo=UTC), {"mean": 0.58}),
    ]
    phases = _assign_phases(samples, planting)
    phase_names = [p[0] for p in phases]
    assert "t0" in phase_names
    assert "current" in phase_names
    t0 = next(p for p in phases if p[0] == "t0")
    assert t0[1] == datetime(2020, 5, 1, tzinfo=UTC)


@pytest.mark.asyncio
async def test_mark_analysis_ready_requires_baselines(monkeypatch):
    from app.services.audit_satellite.timeline import mark_analysis_ready

    engagement = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        status="intake_complete",
        metadata_={},
    )

    async def fake_execute(*args, **kwargs):
        mock = SimpleNamespace()
        mock.scalars = lambda: SimpleNamespace(all=lambda: [])
        return mock

    async def fake_flush():
        return None

    db = SimpleNamespace(execute=fake_execute, flush=fake_flush)

    with pytest.raises(ValueError, match="no_boundaries"):
        await mark_analysis_ready(db, engagement)


@pytest.mark.asyncio
async def test_mark_analysis_ready_refreshes_engagement_after_flush(monkeypatch):
    from unittest.mock import AsyncMock

    from app.services.audit_satellite.timeline import mark_analysis_ready

    engagement = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        status="intake_complete",
        metadata_={},
    )
    boundary = SimpleNamespace(id="b1")
    baseline = SimpleNamespace(backfill_status="found")
    observation = SimpleNamespace(id="o1")

    async def fake_execute(stmt):
        mock = SimpleNamespace()
        sql = str(stmt)
        if "audit_satellite_baseline" in sql:
            mock.scalars = lambda: SimpleNamespace(all=lambda: [baseline])
        elif "boundary_version" in sql:
            mock.scalars = lambda: SimpleNamespace(all=lambda: [boundary])
        else:
            mock.scalars = lambda: SimpleNamespace(all=lambda: [observation])
        return mock

    refresh = AsyncMock()
    db = SimpleNamespace(execute=fake_execute, flush=AsyncMock(), refresh=refresh)

    result = await mark_analysis_ready(db, engagement)

    assert result.status == "analysis_ready"
    refresh.assert_awaited_once_with(engagement)
