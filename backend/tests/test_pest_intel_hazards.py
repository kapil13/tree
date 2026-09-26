"""Pest intel includes fire/flood hazard early warnings."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.planting_projects.pest_intel import build_pest_intel


@pytest.mark.asyncio
async def test_build_pest_intel_includes_fire_and_flood_warnings():
    fence = MagicMock()
    fence.id = uuid.uuid4()
    fence.name = "Block A"
    fence.project_id = uuid.uuid4()
    fence.boundary = None

    db = AsyncMock()

    sat_res = MagicMock()
    sat_res.scalar_one_or_none.return_value = None
    tree_rows = MagicMock()
    tree_rows.all.return_value = []

    db.execute = AsyncMock(side_effect=[sat_res, tree_rows])

    fire_warning = {
        "kind": "fire",
        "severity": "warning",
        "title": "Active fire detected nearby",
        "message": "Nearest ~8 km",
        "source": "firms",
        "distance_km": 8.0,
    }
    flood_warning = {
        "kind": "flood_extent",
        "severity": "warning",
        "title": "Flood / standing water extent signal",
        "message": "SAR water extent rising.",
        "source": "sar",
    }

    with (
        patch(
            "app.services.planting_projects.pest_intel.geography_to_geojson_polygon",
            return_value={"type": "Polygon", "coordinates": [[[75.0, 26.0], [75.1, 26.0], [75.1, 26.1], [75.0, 26.1], [75.0, 26.0]]]},
        ),
        patch("app.services.planting_projects.pest_intel.polygon_centroid", return_value=(26.05, 75.05)),
        patch(
            "app.services.planting_projects.pest_intel.correlate_fence_ecosystem",
            new=AsyncMock(return_value={"bioacoustic": {}, "ndvi_trend": None}),
        ),
        patch("app.services.planting_projects.pest_intel.fetch_forecast", new=AsyncMock(return_value=None)),
        patch(
            "app.services.planting_projects.pest_intel.assess_fire_proximity",
            new=AsyncMock(
                return_value={
                    "risk_level": "watch",
                    "fire_count": 1,
                    "nearest_km": 8.0,
                    "source": "firms",
                    "early_warning": fire_warning,
                }
            ),
        ),
        patch(
            "app.services.planting_projects.pest_intel.assess_fence_flood_extent",
            new=AsyncMock(
                return_value={
                    "risk_level": "moderate",
                    "water_extent_score": 0.7,
                    "delta_score": 0.1,
                    "rain_mm_48h": 40.0,
                    "early_warning": flood_warning,
                }
            ),
        ),
        patch(
            "app.services.planting_projects.pest_intel.locust_early_warning_with_feed",
            new=AsyncMock(return_value=None),
        ),
    ):
        result = await build_pest_intel(db, fence=fence, project=None)

    kinds = {w["kind"] for w in result["early_warnings"]}
    assert "fire" in kinds
    assert "flood_extent" in kinds
    assert result["fire_watch"]["risk_level"] == "watch"
    assert result["flood_extent_watch"]["risk_level"] == "moderate"
