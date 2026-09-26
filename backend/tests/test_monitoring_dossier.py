"""Tests for monitoring dossier live scan data."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.reports.monitoring_dossier import build_monitoring_dossier_context


@pytest.mark.asyncio
async def test_dossier_uses_latest_optical_ndvi_not_stale_health():
    fence_id = uuid.uuid4()
    project = SimpleNamespace(
        id=uuid.uuid4(),
        code="EST-01",
        name="Estate A",
        scheme_code="estate_monitoring",
        segment="estate_monitoring",
        status="active",
        metadata_={},
    )
    fence = SimpleNamespace(
        id=fence_id,
        name="Block A",
        area_ha=120.0,
        last_satellite_at=datetime(2025, 6, 20, tzinfo=UTC),
        project_id=project.id,
    )
    optical = SimpleNamespace(
        id=uuid.uuid4(),
        fence_id=fence_id,
        provider="sentinel-hub",
        scene_id="S2A",
        scene_acquired_at=datetime(2025, 6, 24, tzinfo=UTC),
        ndvi_mean=0.71,
        change_vs_baseline=-0.03,
        cloud_cover_pct=8.0,
        raw_metadata=None,
    )
    health = SimpleNamespace(
        health_status="moderate",
        risk_level="moderate",
        summary="Older analysis",
        ndvi_current=0.55,
        raw_output=None,
    )

    db = AsyncMock()

    async def execute(stmt):
        result = MagicMock()
        sql = str(stmt)
        if "plantation_fences" in sql and "project_id" in sql:
            result.scalars.return_value.all.return_value = [fence]
        elif "satellite_health_analyses" in sql:
            result.scalar_one_or_none.return_value = health
        elif "plantation_satellite_records" in sql:
            result.scalars.return_value.all.return_value = [optical]
        elif "alerts" in sql:
            result.scalars.return_value.all.return_value = []
        else:
            result.scalars.return_value.all.return_value = []
        return result

    db.execute = execute

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(
            "app.services.reports.monitoring_dossier.build_project_scan_history",
            AsyncMock(return_value=[]),
        )
        mp.setattr(
            "app.services.reports.monitoring_dossier.get_scheme",
            lambda code: SimpleNamespace(label="Estate watch") if code else None,
        )
        ctx = await build_monitoring_dossier_context(db, project, owner_user_id=uuid.uuid4())

    assert ctx["work_areas"][0]["latest_ndvi"] == 0.71
    assert ctx["work_areas"][0]["last_satellite_at"].startswith("2025-06-24")
