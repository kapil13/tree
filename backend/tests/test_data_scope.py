"""Role-based portfolio data scoping."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.services.data_scope import (
    apply_owner_org_scope,
    apply_tree_scope,
    can_access_tree,
    user_sees_org_portfolio,
)


def _user(**kwargs):
    defaults = {
        "id": uuid4(),
        "role": "user",
        "organization_id": None,
        "is_org_admin": False,
        "org_role": None,
    }
    defaults.update(kwargs)
    return MagicMock(**defaults)


def test_citizen_does_not_see_org_portfolio():
    user = _user(role="user", organization_id=uuid4())
    assert user_sees_org_portfolio(user) is False


def test_government_manager_sees_org_portfolio():
    user = _user(role="government", organization_id=uuid4(), org_role="manager")
    assert user_sees_org_portfolio(user) is True


@pytest.mark.asyncio
async def test_citizen_tree_scope_is_owner_only(monkeypatch):
    from app.models.tree import Tree

    user = _user(role="user", organization_id=uuid4())
    stmt = MagicMock()
    scoped = MagicMock(return_value=stmt)
    monkeypatch.setattr(
        "app.services.data_scope.apply_owner_org_scope",
        scoped,
    )

    result = await apply_tree_scope(MagicMock(), user, AsyncMock())

    scoped.assert_called_once()
    assert scoped.call_args.kwargs["owner_col"] == Tree.owner_user_id
    assert result is stmt


@pytest.mark.asyncio
async def test_can_access_tree_denies_other_org_tree():
    user = _user(role="user", organization_id=uuid4())
    tree = MagicMock(owner_user_id=uuid4(), organization_id=uuid4(), project_id=None)
    assert await can_access_tree(AsyncMock(), user, tree) is False


@pytest.mark.asyncio
async def test_can_access_tree_allows_org_portfolio():
    org_id = uuid4()
    user = _user(role="government", organization_id=org_id, org_role="manager")
    tree = MagicMock(owner_user_id=uuid4(), organization_id=org_id, project_id=None)
    assert await can_access_tree(AsyncMock(), user, tree) is True


def test_owner_org_scope_citizen_filters_owner_only():
    from app.models.tree import Tree

    user = _user(role="user", organization_id=uuid4())
    stmt = MagicMock()
    apply_owner_org_scope(
        stmt,
        user,
        owner_col=Tree.owner_user_id,
        org_col=Tree.organization_id,
    )
    stmt.where.assert_called_once()
