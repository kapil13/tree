"""Tests for central scheme HTTP API."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.deps import get_current_user
from app.main import app


@pytest.fixture
def mock_user():
    user = MagicMock()
    user.id = "00000000-0000-4000-8000-000000000001"
    user.role = "government"
    user.organization_id = None
    return user


@pytest.fixture
def auth_client(mock_user):
    async def _current_user():
        return mock_user

    app.dependency_overrides[get_current_user] = _current_user
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_schemes_returns_catalog(auth_client):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/schemes")
    assert response.status_code == 200
    payload = response.json()
    assert "items" in payload
    assert len(payload["items"]) >= 8
    codes = {item["code"] for item in payload["items"]}
    assert "campa_ca" in codes
    assert "mishti_mangrove" in codes


@pytest.mark.asyncio
async def test_list_schemes_filters_program(auth_client):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/schemes",
            params={"program_code": "corporate_esg"},
        )
    assert response.status_code == 200
    items = response.json()["items"]
    assert items
    assert all("corporate_esg" in item["program_codes"] for item in items)


@pytest.mark.asyncio
async def test_get_scheme_detail(auth_client):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/schemes/nhai_highway")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "nhai_highway"
    assert data["ministry"] == "MoRTH / NHAI"
    assert data["default_segment"] == "nhai_highway"


@pytest.mark.asyncio
async def test_get_scheme_not_found(auth_client):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/schemes/does_not_exist")
    assert response.status_code == 404
