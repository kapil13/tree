"""Tests for tree photo upload endpoint."""

from __future__ import annotations

import io
import uuid
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.deps import get_current_user
from app.main import app
from app.models.user import User


class _FakeStorage:
    def is_available(self) -> bool:
        return True

    def put_bytes(self, key: str, data: bytes, *, content_type: str = "application/octet-stream") -> str:
        return f"s3://test/{key}"

    def presigned_get(self, key: str, *, expires_in: int = 900) -> str:
        return f"https://example.com/{key}"


@pytest.mark.asyncio
async def test_upload_tree_photo():
    user = User(
        id=uuid.uuid4(),
        email="upload-test@example.com",
        full_name="Upload Test",
        role="farmer",
        is_active=True,
        is_verified=True,
    )

    async def _user_override() -> User:
        return user

    app.dependency_overrides[get_current_user] = _user_override
    try:
        png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
            b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x01\x01\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        transport = ASGITransport(app=app)
        with patch("app.api.v1.trees.get_storage", return_value=_FakeStorage()):
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.post(
                    "/api/v1/trees/uploads/photo",
                    headers={"Authorization": "Bearer test"},
                    files={"file": ("tree.png", io.BytesIO(png), "image/png")},
                )
        assert res.status_code == 200
        body = res.json()
        assert body["key"].startswith(f"trees/{user.id}/")
        assert body["key"].endswith(".png")
    finally:
        app.dependency_overrides.clear()
