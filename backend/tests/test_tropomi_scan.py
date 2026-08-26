"""Tests for TROPOMI CH4 scan service."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

from app.services.emissions import tropomi


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


def test_tropomi_configured(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "sentinel_hub_client_id", None)
    monkeypatch.setattr(settings, "sentinel_hub_client_secret", None)
    assert tropomi.tropomi_configured() is False
    monkeypatch.setattr(settings, "sentinel_hub_client_id", "id")
    monkeypatch.setattr(settings, "sentinel_hub_client_secret", "secret")
    assert tropomi.tropomi_configured() is True


def test_run_tropomi_scan_persists_row(monkeypatch):
    from types import SimpleNamespace

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
