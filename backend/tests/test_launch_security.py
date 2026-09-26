"""Launch security regression — production auth gates and verification links."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_integrations_health_requires_auth_in_production(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health/integrations")
    assert res.status_code == 401
    body = res.json()
    assert body["error"]["code"] == "missing_token"


@pytest.mark.asyncio
async def test_integrations_health_allows_anonymous_in_development(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "development")
    with patch(
        "app.services.intelligence.integrations.check_all_integrations",
        new_callable=AsyncMock,
        return_value={"status": "ok"},
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/health/integrations")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_citizen_cannot_create_verify_link_for_other_users_tree():
    """C1: null-org user A cannot create a verification link for user B's tree."""
    from app.api.v1.verification import create_verification_link_endpoint
    from app.schemas.public_verification import VerificationLinkCreate

    user_a = MagicMock(
        id=uuid.uuid4(),
        organization_id=None,
        role="user",
    )
    tree_owner_b = uuid.uuid4()
    tree = MagicMock(
        id=tree_owner_b,
        organization_id=None,
        owner_id=uuid.uuid4(),
    )

    db = AsyncMock()
    db.get = AsyncMock(return_value=tree)

    request = MagicMock()
    payload = VerificationLinkCreate(
        resource_type="tree",
        resource_id=tree_owner_b,
        label="Impact link",
    )

    with patch(
        "app.api.v1.verification.can_access_tree",
        new_callable=AsyncMock,
        return_value=False,
    ):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            await create_verification_link_endpoint(payload, request, user_a, db)
        assert exc.value.status_code == 403
