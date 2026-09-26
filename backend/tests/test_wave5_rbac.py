"""Tests for Wave 5 RBAC hardening — API guards and org governance."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.api.v1.deps import require_audit_reader, require_write_access, user_has_professional_role
from app.core.security import user_can_write
from app.services.organizations.members import export_org_members_csv, transfer_org_ownership
from app.services.planting_projects.access import can_manage_project


def test_viewer_blocked_from_write_access():
    viewer = MagicMock(org_role="viewer", role="government")
    assert user_can_write(viewer) is False


def test_professional_role_detection():
    gov = MagicMock(role="government")
    citizen = MagicMock(role="user")
    assert user_has_professional_role(gov) is True
    assert user_has_professional_role(citizen) is False


@pytest.mark.asyncio
async def test_org_admin_can_read_audit_without_government_role(monkeypatch):
    admin = MagicMock(role="user", is_org_admin=True, organization_id=uuid.uuid4())
    db = AsyncMock()
    monkeypatch.setattr(
        "app.api.v1.deps.user_can_access_module",
        AsyncMock(return_value=False),
    )
    result = await require_audit_reader(admin, db)
    assert result is admin


@pytest.mark.asyncio
async def test_viewer_cannot_pass_write_access():
    viewer = MagicMock(org_role="viewer", role="government")
    request = MagicMock()
    request.state = MagicMock(impersonation_read_only=False)
    db = AsyncMock()
    row = MagicMock(maintenance_mode=False)
    db.get = AsyncMock(return_value=row)
    with pytest.raises(Exception) as exc:
        await require_write_access(viewer, request, db)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_manage_project():
    viewer = MagicMock(org_role="viewer", role="government")
    project = MagicMock(owner_user_id=uuid.uuid4(), organization_id=uuid.uuid4())
    db = AsyncMock()
    assert await can_manage_project(viewer, project, db) is False


@pytest.mark.asyncio
async def test_export_org_members_csv():
    member = MagicMock(
        full_name="Worker",
        email="w@example.com",
        phone="+919876543210",
        role="field_worker",
        org_role="worker",
        is_org_admin=False,
        is_active=True,
        created_at=MagicMock(isoformat=lambda: "2026-01-01T00:00:00+00:00"),
    )
    db = AsyncMock()
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(
            "app.services.organizations.members.list_org_members",
            AsyncMock(return_value=[member]),
        )
        csv_text = await export_org_members_csv(db, uuid.uuid4())
    assert "Worker" in csv_text
    assert "w@example.com" in csv_text


@pytest.mark.asyncio
async def test_transfer_org_ownership():
    org_id = uuid.uuid4()
    org = MagicMock(id=org_id, owner_user_id=None)
    new_owner_id = uuid.uuid4()
    member = MagicMock(id=new_owner_id, organization_id=org_id, is_org_admin=False)
    db = AsyncMock()
    db.get = AsyncMock(return_value=member)
    db.flush = AsyncMock()
    result = await transfer_org_ownership(db, org=org, new_owner_id=new_owner_id)
    assert result is member
    assert org.owner_user_id == new_owner_id
    assert member.is_org_admin is True
