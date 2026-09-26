"""Sentinel Hub Statistics API CRS84 resolution helpers."""

from __future__ import annotations

from app.services.satellite.sentinel_hub import (
    SentinelHubClient,
    _bounds_centroid_lat,
    resolution_degrees,
)


def test_resolution_degrees_near_10m_at_equator():
    res = resolution_degrees(0.0, meters=10.0)
    assert 0.00008 < res < 0.00010


def test_resolution_degrees_adjusts_for_latitude():
    equator = resolution_degrees(0.0, meters=10.0)
    mid_lat = resolution_degrees(26.0, meters=10.0)
    assert mid_lat > equator


def test_bounds_centroid_lat_from_bbox():
    bounds = {"bbox": [70.0, 26.0, 71.0, 27.0], "properties": {}}
    assert _bounds_centroid_lat(bounds) == 26.5


def test_statistics_request_uses_degree_resolution_not_meters_literal():
    client = SentinelHubClient("id", "secret", api_base_url="https://example.com", token_url="https://example.com/token")
    bounds = {
        "bbox": [70.89, 26.89, 70.91, 26.91],
        "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
    }
    from datetime import UTC, datetime

    body = client._build_statistics_request(
        bounds,
        time_from=datetime(2026, 1, 1, tzinfo=UTC),
        time_to=datetime(2026, 2, 1, tzinfo=UTC),
        interval="P1D",
    )
    res = body["aggregation"]["resx"]
    assert res < 0.001
    assert res != 10
