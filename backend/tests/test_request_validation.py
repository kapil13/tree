"""Request validation error envelope — must not 500 on pydantic failures."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_validation_error_returns_422_not_500():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "demo@byot.earth", "password": "byotdemo1234!"},
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        res = await client.post(
            "/api/v1/trees",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "program_code": "byot",
                "species_text": "Neem",
                "latitude": "not-a-number",
                "longitude": 75.74413,
                "planted_at": "2026-09-04T14:59:00.000Z",
                "photo_keys": [],
            },
        )
    assert res.status_code == 422
    body = res.json()
    assert body["error"]["code"] == "validation_error"
    assert isinstance(body["error"]["details"]["errors"], list)
