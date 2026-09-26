"""Tests for platform admin Phase 2 — delegated modules, orgs, permissions."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.security import Permission, all_permission_labels, permissions_matrix
from app.services.platform.admin import query_platform_organizations
from app.services.platform.modules import (
    ALL_PLATFORM_MODULES,
    BILLING_ADMIN_MODULE,
    OPS_ADMIN_MODULE,
    PROGRAM_ACCESS_ADMIN_MODULE,
    USERS_ADMIN_MODULE,
    build_platform_access_map,
    user_can_access_module,
)


def test_permissions_matrix_covers_all_roles():
    matrix = permissions_matrix()
    assert "admin" in matrix
    assert "farmer" in matrix
    assert Permission.TREE_READ.value in matrix["farmer"]


def test_all_permission_labels_excludes_admin_wildcard():
    labels = all_permission_labels()
    assert "admin:*" not in labels
    assert "tree:read" in labels


@pytest.mark.asyncio
async def test_build_platform_access_map_admin_all_true(monkeypatch):
    db = AsyncMock()
    rule = MagicMock(enabled=True, allowed_roles=["government"])
    monkeypatch.setattr(
        "app.services.platform.modules.ensure_platform_modules_seeded",
        AsyncMock(),
    )
    monkeypatch.setattr(
        "app.services.platform.modules.get_module_rule",
        AsyncMock(return_value=rule),
    )
    access = await build_platform_access_map(db, role="admin")
    assert all(access.values())
    assert set(access.keys()) == set(ALL_PLATFORM_MODULES)


@pytest.mark.asyncio
async def test_user_can_access_module_delegated_role(monkeypatch):
    db = AsyncMock()
    rule = MagicMock(enabled=True, allowed_roles=["government"])
    monkeypatch.setattr(
        "app.services.platform.modules.ensure_platform_modules_seeded",
        AsyncMock(),
    )
    monkeypatch.setattr(
        "app.services.platform.modules.get_module_rule",
        AsyncMock(return_value=rule),
    )
    assert await user_can_access_module(db, role="government", module_key=USERS_ADMIN_MODULE)
    assert not await user_can_access_module(db, role="farmer", module_key=USERS_ADMIN_MODULE)


@pytest.mark.asyncio
async def test_query_platform_organizations_empty():
    db = AsyncMock()
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    rows_result = MagicMock()
    rows_result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(side_effect=[count_result, rows_result])
    items, total = await query_platform_organizations(db)
    assert items == []
    assert total == 0


def test_phase2_module_keys_defined():
    assert USERS_ADMIN_MODULE == "users_admin"
    assert PROGRAM_ACCESS_ADMIN_MODULE == "program_access_admin"
    assert BILLING_ADMIN_MODULE == "billing_admin"
    assert OPS_ADMIN_MODULE == "ops_admin"
