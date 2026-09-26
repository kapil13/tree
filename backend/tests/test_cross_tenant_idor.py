"""Platform Foundation E2 — cross-tenant IDOR guards across resource routers."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.deps import get_current_user
from app.main import app


def _user(**kwargs):
    defaults = {
        "id": uuid.uuid4(),
        "role": "government",
        "organization_id": uuid.uuid4(),
        "is_org_admin": True,
        "is_active": True,
        "org_role": "manager",
        "sessions_invalidated_at": None,
    }
    defaults.update(kwargs)
    return MagicMock(**defaults)


@pytest.fixture
def client_override():
    user = _user()
    db = AsyncMock()

    async def _current_user():
        return user

    from app.api.v1 import deps

    async def _db():
        return db

    app.dependency_overrides[get_current_user] = _current_user
    app.dependency_overrides[deps.get_db] = _db
    yield user, db
    app.dependency_overrides.clear()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method", "path", "patch_target", "expected_status"),
    [
        ("GET", "/api/v1/trees/{id}", "app.api.v1.trees.can_access_tree", 403),
        ("GET", "/api/v1/planting-projects/{id}", "app.api.v1.planting_projects.load_project", 404),
        ("GET", "/api/v1/compliance/projects/{id}/checklists", "app.api.v1.compliance.load_project", 404),
        ("GET", "/api/v1/credits/projects/{id}", "app.api.v1.credits.load_project", 404),
        ("GET", "/api/v1/payments/orders/{id}", "app.api.v1.payments.get_order_for_user", 404),
        ("DELETE", "/api/v1/webhooks/{id}", "webhook_foreign", 404),
    ],
)
async def test_foreign_resource_access_denied(
    client_override,
    method,
    path,
    patch_target,
    expected_status,
):
    user, db = client_override
    resource_id = uuid.uuid4()
    url = path.format(id=resource_id)

    patches = []
    if patch_target == "app.api.v1.trees.can_access_tree":
        patches.append(patch(patch_target, new=AsyncMock(return_value=False)))
    elif patch_target and "load_project" in patch_target:
        patches.append(patch(patch_target, new=AsyncMock(return_value=None)))
    elif patch_target == "app.api.v1.payments.get_order_for_user":
        patches.append(
            patch("app.api.v1.payments.assert_org_feature_enabled", new=AsyncMock())
        )
        patches.append(patch(patch_target, new=AsyncMock(return_value=None)))
    elif patch_target == "webhook_foreign":
        foreign = MagicMock(organization_id=uuid.uuid4())
        db.get = AsyncMock(return_value=foreign)
    elif patch_target is None:
        patches.append(
            patch(
                "app.services.privacy.export.build_user_data_export",
                new=AsyncMock(return_value={"profile": {}}),
            )
        )

    for p in patches:
        p.start()
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            if method == "GET":
                res = await client.get(url)
            else:
                res = await client.request(method, url)
    finally:
        for p in patches:
            p.stop()

    if patch_target is None:
        assert res.status_code == expected_status
    else:
        assert res.status_code == expected_status
