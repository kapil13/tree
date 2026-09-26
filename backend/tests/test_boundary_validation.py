"""Geospatial boundary validation for monitoring sweeps."""

from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

from app.services.monitoring.boundary_validation import try_fence_boundary_geojson


def test_try_fence_boundary_geojson_returns_polygon():
    fence = MagicMock()
    fence.id = uuid.uuid4()
    fence.name = "Block A"
    with patch(
        "app.services.monitoring.boundary_validation.geography_to_geojson_polygon",
        return_value={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]},
    ):
        result = try_fence_boundary_geojson(fence)
    assert result is not None
    assert result["type"] == "Polygon"


def test_try_fence_boundary_geojson_returns_none_on_invalid():
    fence = MagicMock()
    fence.id = uuid.uuid4()
    fence.name = "Broken"
    with patch(
        "app.services.monitoring.boundary_validation.geography_to_geojson_polygon",
        side_effect=ValueError("invalid geometry"),
    ):
        result = try_fence_boundary_geojson(fence)
    assert result is None
