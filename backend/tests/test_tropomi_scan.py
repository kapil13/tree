"""Tests for TROPOMI CH4 scan service."""

from __future__ import annotations

import asyncio
import json
import math
import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.deps import get_current_user
from app.main import app
from app.services.emissions import tropomi


def test_sanitize_ppb_handles_non_finite():
    assert tropomi._sanitize_ppb(float("nan")) is None
    assert tropomi._sanitize_ppb(float("inf")) is None
    assert tropomi._sanitize_ppb(float("-inf")) is None
    assert tropomi._sanitize_ppb(1875.456) == 1875.46


def test_series_payload_computes_anomaly():
    series = [
        (datetime(2024, 1, 1, tzinfo=UTC), {"mean": 1850.0, "min": 1840.0, "max": 1860.0}),
        (datetime(2024, 2, 1, tzinfo=UTC), {"mean": 1860.0, "min": 1850.0, "max": 1870.0}),
        (datetime(2024, 3, 1, tzinfo=UTC), {"mean": 1905.0, "min": 1890.0, "max": 1920.0}),
    ]
    points, summary = tropomi._series_payload(series)
    assert len(points) == 3
    assert summary["latest_mean_ppb"] == 1905.0
    assert summary["baseline_ppb"] == 1855.0
    assert summary["anomaly_ppb"] == 50.0


def test_series_payload_sanitizes_nan_and_infinity():
    series = [
        (
            datetime(2024, 1, 1, tzinfo=UTC),
            {"mean": math.nan, "min": math.inf, "max": -math.inf},
        ),
        (datetime(2024, 2, 1, tzinfo=UTC), {"mean": 1860.0, "min": 1850.0, "max": 1870.0}),
    ]
    points, summary = tropomi._series_payload(series)
    assert points[0]["mean_ppb"] is None
    assert points[0]["min_ppb"] is None
    assert points[0]["max_ppb"] is None
    assert summary["latest_mean_ppb"] == 1860.0
    assert summary["baseline_ppb"] == 1860.0
    assert summary["anomaly_ppb"] == 0.0

    safe = tropomi.json_safe_scan_payload({"series": points, "summary": summary})
    json.dumps(safe, allow_nan=False)


def test_non_finite_values_fail_strict_json_without_sanitizer():
    with pytest.raises(ValueError):
        json.dumps({"mean_ppb": float("nan")}, allow_nan=False)


def test_tropomi_configured(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "sentinel_hub_client_id", None)
    monkeypatch.setattr(settings, "sentinel_hub_client_secret", None)
    assert tropomi.tropomi_configured() is False
    monkeypatch.setattr(settings, "sentinel_hub_client_id", "id")
    monkeypatch.setattr(settings, "sentinel_hub_client_secret", "secret")
    assert tropomi.tropomi_configured() is True


def test_run_tropomi_scan_persists_row(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "sentinel_hub_client_id", "id")
    monkeypatch.setattr(settings, "sentinel_hub_client_secret", "secret")
    monkeypatch.setattr(settings, "emission_satellite_buffer_km", 25.0)

    work_area = SimpleNamespace(
        id="wa-1",
        project_id="proj-1",
        boundary=SimpleNamespace(),
    )
    user = SimpleNamespace(id="user-1")

    fake_series = [
        (datetime(2024, 6, 1, tzinfo=UTC), {"mean": 1875.0, "min": 1860.0, "max": 1890.0}),
    ]

    class FakeDb:
        def add(self, row):
            self.row = row

        async def flush(self):
            return None

    db = FakeDb()

    with (
        patch(
            "app.services.emissions.tropomi.geography_to_geojson_polygon",
            return_value={
                "type": "Polygon",
                "coordinates": [[[77.0, 28.0], [77.1, 28.0], [77.1, 28.1], [77.0, 28.1], [77.0, 28.0]]],
            },
        ),
        patch(
            "app.services.emissions.tropomi._client",
        ) as client_factory,
    ):
        client = AsyncMock()
        client.fetch_polygon_s5p_ch4_series = AsyncMock(return_value=fake_series)
        client_factory.return_value = client

        row = asyncio.run(
            tropomi.run_tropomi_scan(
                db,  # type: ignore[arg-type]
                project_id="proj-1",  # type: ignore[arg-type]
                work_area=work_area,  # type: ignore[arg-type]
                user=user,
            )
        )

    assert row.provider == "sentinel-5p-tropomi"
    assert row.summary["latest_mean_ppb"] == 1875.0
    assert row.roi_geojson["type"] == "Polygon"
    json.dumps({"series": row.series, "summary": row.summary}, allow_nan=False)


def test_run_tropomi_scan_persists_json_safe_nan_series(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "sentinel_hub_client_id", "id")
    monkeypatch.setattr(settings, "sentinel_hub_client_secret", "secret")
    monkeypatch.setattr(settings, "emission_satellite_buffer_km", 25.0)

    work_area = SimpleNamespace(
        id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        boundary=SimpleNamespace(),
    )
    user = SimpleNamespace(id=uuid.uuid4())

    fake_series = [
        (
            datetime(2024, 6, 1, tzinfo=UTC),
            {"mean": math.nan, "min": math.inf, "max": -math.inf},
        ),
    ]

    class FakeDb:
        def add(self, row):
            self.row = row

        async def flush(self):
            return None

    db = FakeDb()

    with (
        patch(
            "app.services.emissions.tropomi.geography_to_geojson_polygon",
            return_value={
                "type": "Polygon",
                "coordinates": [[[77.0, 28.0], [77.1, 28.0], [77.1, 28.1], [77.0, 28.1], [77.0, 28.0]]],
            },
        ),
        patch("app.services.emissions.tropomi._client") as client_factory,
    ):
        client = AsyncMock()
        client.fetch_polygon_s5p_ch4_series = AsyncMock(return_value=fake_series)
        client_factory.return_value = client

        row = asyncio.run(
            tropomi.run_tropomi_scan(
                db,  # type: ignore[arg-type]
                project_id=work_area.project_id,
                work_area=work_area,  # type: ignore[arg-type]
                user=user,
            )
        )

    assert row.series[0]["mean_ppb"] is None
    assert row.series[0]["min_ppb"] is None
    assert row.series[0]["max_ppb"] is None
    assert row.summary["latest_mean_ppb"] is None
    json.dumps({"series": row.series, "summary": row.summary}, allow_nan=False)


@pytest.fixture
def auth_client():
    user = MagicMock()
    user.id = uuid.uuid4()

    async def _current_user():
        return user

    app.dependency_overrides[get_current_user] = _current_user
    yield user
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_satellite_scan_endpoint_returns_201_with_nan_sanitized_data(auth_client):
    project_id = uuid.uuid4()
    work_area_id = uuid.uuid4()
    scan_id = uuid.uuid4()
    now = datetime.now(UTC)

    scan_row = SimpleNamespace(
        id=scan_id,
        project_id=project_id,
        work_area_id=work_area_id,
        gas_type="CH4",
        provider="sentinel-5p-tropomi",
        buffer_km=25.0,
        roi_geojson={"type": "Polygon", "coordinates": []},
        series=[
            {
                "time": now.isoformat(),
                "mean_ppb": None,
                "min_ppb": None,
                "max_ppb": None,
            }
        ],
        summary={
            "latest_time": now.isoformat(),
            "latest_mean_ppb": None,
            "baseline_ppb": None,
            "anomaly_ppb": None,
            "months": 1,
        },
        status="complete",
        created_at=now,
        updated_at=now,
    )

    work_area = SimpleNamespace(id=work_area_id, project_id=project_id)
    project = SimpleNamespace(id=project_id)

    class FakeResult:
        def scalar_one_or_none(self):
            return work_area

    class FakeDb:
        async def execute(self, _query):
            return FakeResult()

        async def commit(self):
            return None

        async def refresh(self, _row):
            return None

    async def _db():
        return FakeDb()

    from app.api.v1 import deps

    app.dependency_overrides[deps.get_db] = _db

    with (
        patch("app.api.v1.emissions.load_project", new=AsyncMock(return_value=project)),
        patch("app.api.v1.emissions.tropomi_configured", return_value=True),
        patch("app.api.v1.emissions.run_tropomi_scan", new=AsyncMock(return_value=scan_row)),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/planting-projects/{project_id}/work-areas/{work_area_id}/satellite-scan",
                json={"months": 12},
            )

    app.dependency_overrides.pop(deps.get_db, None)

    assert response.status_code == 201
    body = response.json()
    assert body["series"][0]["mean_ppb"] is None
    assert body["summary"]["latest_mean_ppb"] is None
