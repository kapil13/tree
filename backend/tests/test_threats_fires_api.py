"""Tests for GET /api/v1/threats/fires."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.deps import get_current_user, require_satellite_feature
from app.main import app
from app.services.threats.firms_client import FireDetection


@pytest.fixture
def auth_client():
    user = MagicMock()
    user.id = uuid.uuid4()
    user.organization_id = None
    user.role = "admin"

    async def _current_user():
        return user

    async def _satellite_feature():
        return None

    app.dependency_overrides[get_current_user] = _current_user
    app.dependency_overrides[require_satellite_feature] = _satellite_feature
    yield user
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_threats_fires_returns_detections(auth_client):
    fence_id = uuid.uuid4()
    fence = SimpleNamespace(
        id=fence_id,
        name="Block A",
        boundary=SimpleNamespace(),
    )
    fires = [
        FireDetection(
            latitude=26.88,
            longitude=75.75,
            confidence="high",
            frp=25.0,
            acq_date="2026-03-01",
            satellite="VIIRS",
        )
    ]
    assessment = {
        "fire_count": 1,
        "nearest_km": 4.2,
        "risk_level": "high",
    }

    with (
        patch("app.api.v1.threats._load_fence", new=AsyncMock(return_value=fence)),
        patch(
            "app.api.v1.threats.geography_to_geojson_polygon",
            return_value={"type": "Polygon", "coordinates": [[[75.74, 26.87], [75.75, 26.87], [75.75, 26.88], [75.74, 26.88], [75.74, 26.87]]]},
        ),
        patch("app.api.v1.threats.polygon_centroid", return_value=(26.8761, 75.7442)),
        patch("app.api.v1.threats.fetch_fires_near_point", new=AsyncMock(return_value=fires)),
        patch("app.api.v1.threats.assess_fire_proximity", new=AsyncMock(return_value=assessment)),
        patch("app.api.v1.threats.has_firms_credentials", return_value=True),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/threats/fires",
                params={"fence_id": str(fence_id), "days": 1},
            )

    assert response.status_code == 200
    payload = response.json()
    assert payload["fence_id"] == str(fence_id)
    assert payload["fence_name"] == "Block A"
    assert payload["fire_count"] == 1
    assert payload["risk_level"] == "high"
    assert len(payload["detections"]) == 1
    assert payload["detections"][0]["latitude"] == pytest.approx(26.88)
    assert payload["firms_configured"] is True
