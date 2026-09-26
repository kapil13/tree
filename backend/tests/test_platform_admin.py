"""Tests for platform admin Phase 1 APIs."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.security import Permission, has_permission
from app.services.platform.admin import build_platform_overview, query_platform_users


def test_platform_admin_has_users_manage():
    assert has_permission("admin", Permission.PLATFORM_USERS_MANAGE)


@pytest.mark.asyncio
async def test_build_platform_overview_counts():
    db = AsyncMock()
    result_mock = MagicMock()
    result_mock.scalar_one.return_value = 5
    db.execute = AsyncMock(return_value=result_mock)
    result = await build_platform_overview(db)
    assert result["users"]["total"] == 5
    assert result["program_access"]["pending"] == 5


@pytest.mark.asyncio
async def test_query_platform_users_empty():
    db = AsyncMock()
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    rows_result = MagicMock()
    rows_result.all.return_value = []
    db.execute = AsyncMock(side_effect=[count_result, rows_result])
    items, total = await query_platform_users(db)
    assert items == []
    assert total == 0


def test_audit_platform_admin_sees_all_logs():
    """Platform admins with users:manage should not be org-scoped in audit queries."""
    from app.core.security import Permission, has_permission

    assert has_permission("admin", Permission.PLATFORM_USERS_MANAGE)
    assert not has_permission("government", Permission.PLATFORM_USERS_MANAGE)
