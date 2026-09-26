"""Phase B — verifier provisioning, project roles, and access helpers."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.security import Permission, has_permission
from app.services.organizations.onboarding import ORG_ROLES, platform_role_for_org_member
from app.services.planting_projects.access import (
    PROJECT_ATTEST_ROLES,
    PROJECT_VIEWER_ROLE,
    can_attest_project,
    can_manage_project,
)


def test_org_roles_include_verifier():
    assert "verifier" in ORG_ROLES


def test_platform_role_for_org_verifier():
    assert platform_role_for_org_member("verifier", "government") == "verifier"
    assert platform_role_for_org_member("verifier", "corporate") == "verifier"


def test_verifier_has_attest_permission():
    assert has_permission("verifier", Permission.MEASUREMENT_ATTEST)
    assert not has_permission("verifier", Permission.TREE_UPDATE)


def test_project_role_constants():
    assert "project_verifier" in PROJECT_ATTEST_ROLES
    assert PROJECT_VIEWER_ROLE == "project_viewer"


@pytest.mark.asyncio
async def test_project_verifier_can_attest_but_not_manage():
    user = MagicMock(
        id=uuid.uuid4(),
        role="field_worker",
        organization_id=None,
        org_role="worker",
    )
    project = MagicMock(id=uuid.uuid4(), owner_user_id=uuid.uuid4(), organization_id=uuid.uuid4())
    membership = MagicMock(role="project_verifier")
    db = AsyncMock()

    with (
        patch(
            "app.services.planting_projects.access.can_access_project",
            new=AsyncMock(return_value=True),
        ),
        patch(
            "app.services.planting_projects.access.get_project_membership",
            new=AsyncMock(return_value=membership),
        ),
    ):
        assert await can_attest_project(user, project, db) is True
        assert await can_manage_project(user, project, db) is False


@pytest.mark.asyncio
async def test_project_viewer_cannot_manage():
    user = MagicMock(
        id=uuid.uuid4(),
        role="field_worker",
        organization_id=None,
        org_role="worker",
    )
    project = MagicMock(id=uuid.uuid4(), owner_user_id=uuid.uuid4(), organization_id=uuid.uuid4())
    membership = MagicMock(role=PROJECT_VIEWER_ROLE)
    db = AsyncMock()

    with (
        patch("app.services.planting_projects.access.user_can_write", return_value=True),
        patch(
            "app.services.planting_projects.access.get_project_membership",
            new=AsyncMock(return_value=membership),
        ),
    ):
        assert await can_manage_project(user, project, db) is False
