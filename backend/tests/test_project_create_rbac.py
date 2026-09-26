"""Phase A — project creation requires professional access."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.deps import get_current_user, require_write_professional
from app.main import app


def _user(**kwargs):
    defaults = {
        "id": uuid.uuid4(),
        "role": "field_worker",
        "organization_id": uuid.uuid4(),
        "is_org_admin": False,
        "is_active": True,
        "org_role": "worker",
        "sessions_invalidated_at": None,
    }
    defaults.update(kwargs)
    return MagicMock(**defaults)


@pytest.mark.asyncio
async def test_field_worker_cannot_create_project():
    user = _user(role="field_worker", org_role="worker")

    async def _write_professional():
        from fastapi import HTTPException, status

        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="professional_access_required")

    from app.api.v1 import deps

    async def _db():
        return AsyncMock()

    app.dependency_overrides[require_write_professional] = _write_professional
    app.dependency_overrides[deps.get_db] = _db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/planting-projects",
            json={
                "code": f"FW-{uuid.uuid4().hex[:8]}",
                "name": "Field worker project",
                "segment": "general",
                "compliance_mode": "open",
                "program_code": "byot",
            },
        )

    app.dependency_overrides.clear()
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "professional_access_required"


@pytest.mark.asyncio
async def test_require_write_professional_allows_government_manager():
    from app.api.v1.deps import require_write_professional

    user = _user(role="government", org_role="manager")
    request = MagicMock()
    request.state = MagicMock(impersonation_read_only=False)
    db = AsyncMock()

    with patch(
        "app.services.platform.governance.assert_writes_allowed",
        new=AsyncMock(),
    ), patch(
        "app.api.v1.deps.user_can_write",
        return_value=True,
    ):
        result = await require_write_professional(user, request, db)
    assert result is user


@pytest.mark.asyncio
async def test_require_write_professional_blocks_field_worker():
    from app.api.v1.deps import require_write_professional
    from fastapi import HTTPException

    user = _user(role="field_worker", org_role="worker")
    request = MagicMock()
    request.state = MagicMock(impersonation_read_only=False)
    db = AsyncMock()

    with patch(
        "app.services.platform.governance.assert_writes_allowed",
        new=AsyncMock(),
    ), patch(
        "app.api.v1.deps.user_can_write",
        return_value=True,
    ), patch(
        "app.api.v1.deps.list_user_program_codes",
        new=AsyncMock(return_value=[]),
    ):
        with pytest.raises(HTTPException) as exc:
            await require_write_professional(user, request, db)
    assert exc.value.status_code == 403
    assert exc.value.detail == "professional_access_required"
