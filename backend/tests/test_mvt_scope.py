"""MVT tile scope mirrors field-worker project access."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.services.data_scope import mvt_tree_scope_binds, user_is_field_worker


class _User:
    def __init__(self, **kwargs):
        self.role = kwargs.get("role", "user")
        self.id = kwargs.get("id", uuid.uuid4())
        self.organization_id = kwargs.get("organization_id")
        self.is_org_admin = kwargs.get("is_org_admin", False)
        self.org_role = kwargs.get("org_role")


@pytest.mark.asyncio
async def test_mvt_scope_field_worker_includes_project_ids() -> None:
    user = _User(role="field_worker")
    project_id = uuid.uuid4()
    with patch(
        "app.services.data_scope.field_worker_project_ids",
        new_callable=AsyncMock,
        return_value={project_id},
    ):
        binds = await mvt_tree_scope_binds(user, AsyncMock())
    assert binds["is_field_worker"] is True
    assert binds["project_ids"] == [str(project_id)]
    assert user_is_field_worker(user)


@pytest.mark.asyncio
async def test_mvt_scope_org_portfolio_for_ngo() -> None:
    org_id = uuid.uuid4()
    user = _User(role="ngo", organization_id=org_id)
    binds = await mvt_tree_scope_binds(user, AsyncMock())
    assert binds["org_portfolio"] is True
    assert binds["is_field_worker"] is False
