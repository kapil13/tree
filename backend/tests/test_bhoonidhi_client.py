"""Tests for Bhoonidhi STAC client."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.satellite.bhoonidhi_client import (
    BhoonidhiClient,
    polygon_bbox_wgs84,
    summarize_stac_features,
)


def test_polygon_bbox():
    geo = {
        "type": "Polygon",
        "coordinates": [[[78.0, 17.0], [79.0, 17.0], [79.0, 18.0], [78.0, 18.0], [78.0, 17.0]]],
    }
    assert polygon_bbox_wgs84(geo) == [78.0, 17.0, 79.0, 18.0]


def test_summarize_stac_features():
    payload = {
        "features": [
            {
                "id": "scene-1",
                "collection": "ResourceSat-2A_LISS3_BOA",
                "properties": {"datetime": "2024-06-01T00:00:00Z", "Online": "Y"},
            }
        ]
    }
    rows = summarize_stac_features(payload)
    assert len(rows) == 1
    assert rows[0]["id"] == "scene-1"


@pytest.mark.asyncio
async def test_authenticate_stores_token():
    client = BhoonidhiClient(user_id="u", password="p", api_base_url="https://example.test")
    mock_resp = AsyncMock()
    mock_resp.raise_for_status = lambda: None
    mock_resp.json.return_value = {
        "access_token": "tok",
        "refresh_token": "ref",
        "expires_in": 1200,
    }

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__.return_value = mock_client
        mock_client.__aexit__.return_value = None
        mock_client.post.return_value = mock_resp
        mock_client_cls.return_value = mock_client
        await client.authenticate()

    assert client._access_token == "tok"
    assert client._refresh_token == "ref"
