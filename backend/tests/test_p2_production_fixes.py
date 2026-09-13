"""P2 production readiness — refresh rotation, payment IDOR, cross-tenant API guards."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.deps import get_current_user
from app.core.security import create_refresh_token
from app.main import app
from app.services.auth.token_denylist import clear_memory_denylist


def _user(**kwargs):
    defaults = {
        "id": uuid.uuid4(),
        "role": "government",
        "organization_id": uuid.uuid4(),
        "is_org_admin": False,
        "is_active": True,
        "org_role": "manager",
        "sessions_invalidated_at": None,
    }
    defaults.update(kwargs)
    return MagicMock(**defaults)


@pytest.fixture(autouse=True)
def _clear_denylist():
    clear_memory_denylist()
    yield
    clear_memory_denylist()


@pytest.mark.asyncio
async def test_refresh_rotates_and_revokes_old_token():
    user = _user()
    refresh = create_refresh_token(user.id)

    async def _current_user():
        return user

    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=user))
    )

    from app.api.v1 import deps

    async def _db():
        return db

    app.dependency_overrides[get_current_user] = _current_user
    app.dependency_overrides[deps.get_db] = _db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        first = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
        assert first.status_code == 200
        new_refresh = first.json()["refresh_token"]
        assert new_refresh != refresh

        reuse = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
        assert reuse.status_code == 401
        assert reuse.json()["error"]["code"] == "invalid_refresh"

        second = await client.post("/api/v1/auth/refresh", json={"refresh_token": new_refresh})
        assert second.status_code == 200

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_payment_order_foreign_user_returns_404():
    user = _user()
    foreign_order_id = uuid.uuid4()

    async def _current_user():
        return user

    db = AsyncMock()

    from app.api.v1 import deps

    async def _db():
        return db

    app.dependency_overrides[get_current_user] = _current_user
    app.dependency_overrides[deps.get_db] = _db

    with patch(
        "app.api.v1.payments.assert_org_feature_enabled",
        new=AsyncMock(),
    ), patch(
        "app.api.v1.payments.get_order_for_user",
        new=AsyncMock(return_value=None),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get(f"/api/v1/payments/orders/{foreign_order_id}")

    app.dependency_overrides.clear()
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "order_not_found"


@pytest.mark.asyncio
async def test_webhook_create_requires_org_admin():
    member = _user(is_org_admin=False)

    async def _current_user():
        return member

    db = AsyncMock()

    from app.api.v1 import deps

    async def _db():
        return db

    app.dependency_overrides[get_current_user] = _current_user
    app.dependency_overrides[deps.get_db] = _db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/webhooks",
            json={
                "label": "Test",
                "url": "https://example.com/hook",
                "events": ["webhook.test"],
            },
        )

    app.dependency_overrides.clear()
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "org_admin_required"


@pytest.mark.asyncio
async def test_tree_foreign_org_returns_forbidden():
    user = _user()
    tree_id = uuid.uuid4()
    foreign_tree = MagicMock(
        id=tree_id,
        owner_user_id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        project_id=None,
    )

    async def _current_user():
        return user

    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=foreign_tree))
    )

    from app.api.v1 import deps

    async def _db():
        return db

    app.dependency_overrides[get_current_user] = _current_user
    app.dependency_overrides[deps.get_db] = _db

    with patch(
        "app.api.v1.trees.can_access_tree",
        new=AsyncMock(return_value=False),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get(f"/api/v1/trees/{tree_id}")

    app.dependency_overrides.clear()
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_credits_foreign_project_returns_not_found():
    user = _user()
    project_id = uuid.uuid4()

    async def _current_user():
        return user

    db = AsyncMock()

    from app.api.v1 import deps

    async def _db():
        return db

    app.dependency_overrides[get_current_user] = _current_user
    app.dependency_overrides[deps.get_db] = _db

    with patch(
        "app.api.v1.credits.load_project",
        new=AsyncMock(return_value=None),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get(f"/api/v1/credits/projects/{project_id}")

    app.dependency_overrides.clear()
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "project_not_found"


@pytest.mark.asyncio
async def test_compliance_foreign_project_returns_not_found():
    user = _user()
    project_id = uuid.uuid4()

    async def _current_user():
        return user

    db = AsyncMock()

    from app.api.v1 import deps

    async def _db():
        return db

    app.dependency_overrides[get_current_user] = _current_user
    app.dependency_overrides[deps.get_db] = _db

    with patch(
        "app.api.v1.compliance.load_project",
        new=AsyncMock(return_value=None),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get(f"/api/v1/compliance/projects/{project_id}/checklists")

    app.dependency_overrides.clear()
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "project_not_found"
