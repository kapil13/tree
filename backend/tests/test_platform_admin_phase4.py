"""Tests for platform admin Phase 4 — org drill-down, audit, impersonation."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.platform.audit import export_platform_audit_csv, query_platform_audit_logs
from app.services.platform.impersonation import (
    ImpersonationError,
    impersonation_token_for,
    validate_impersonation_target,
)
from app.services.platform.settings import build_platform_settings


def test_build_platform_settings_keys():
    settings = build_platform_settings()
    assert "app_env" in settings
    assert "payments_enabled" in settings
    assert "bioacoustic_pipeline" in settings


@pytest.mark.asyncio
async def test_query_platform_audit_logs_empty():
    db = AsyncMock()
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    rows_result = MagicMock()
    rows_result.all.return_value = []
    db.execute = AsyncMock(side_effect=[count_result, rows_result])
    items, total = await query_platform_audit_logs(db)
    assert items == []
    assert total == 0


@pytest.mark.asyncio
async def test_export_platform_audit_csv_header():
    db = AsyncMock()
    rows_result = MagicMock()
    rows_result.all.return_value = []
    db.execute = AsyncMock(return_value=rows_result)
    csv_text = await export_platform_audit_csv(db)
    assert "created_at,action,actor_email" in csv_text


def test_impersonation_token_contains_imp_by():
    admin = MagicMock(id=uuid.uuid4(), email="admin@example.com", role="admin", organization_id=None)
    target = MagicMock(
        id=uuid.uuid4(),
        email="user@example.com",
        role="user",
        organization_id=None,
        is_active=True,
    )
    token_data = impersonation_token_for(admin=admin, target=target)
    assert token_data["impersonated_by_id"] == admin.id
    assert token_data["access_token"]


@pytest.mark.asyncio
async def test_validate_impersonation_rejects_admin_target():
    admin = MagicMock(id=uuid.uuid4(), role="admin", is_active=True)
    target = MagicMock(id=uuid.uuid4(), role="admin", is_active=True)
    db = AsyncMock()
    with pytest.raises(ImpersonationError, match="cannot_impersonate_admin"):
        await validate_impersonation_target(db, admin=admin, target=target)
