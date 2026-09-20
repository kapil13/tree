"""Audit engagement access controls (Wave A / P22, expanded Wave D)."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_project import PlantingProject
from app.models.user import User
from app.services.planting_projects.access import can_access_project, can_manage_project

_AUDIT_WRITE_ORG_ROLES = frozenset({"manager", "supervisor"})
_AUDIT_READ_ORG_ROLES = frozenset({"manager", "supervisor", "worker", "viewer"})


async def can_read_audit_engagement(
    user: User,
    project: PlantingProject,
    db: AsyncSession,
) -> bool:
    """Read access for portfolio, export summary, and verification."""
    if await can_access_project(user, project, db):
        if user.role == "admin" or await can_manage_project(user, project, db):
            return True
        if user.org_role in _AUDIT_READ_ORG_ROLES:
            return True
        return user.organization_id == project.organization_id
    return False


async def can_write_audit_engagement(
    user: User,
    project: PlantingProject,
    db: AsyncSession,
) -> bool:
    """Mutation access for intake, sampling, export create."""
    if await can_manage_project(user, project, db):
        return True
    return (
        user.organization_id == project.organization_id
        and user.org_role in _AUDIT_WRITE_ORG_ROLES
    )


async def can_verify_audit_export(
    user: User,
    project: PlantingProject,
    db: AsyncSession,
) -> bool:
    """Verifier read-only access for export verification."""
    return await can_read_audit_engagement(user, project, db)


async def require_audit_engagement_write(
    user: User,
    project: PlantingProject,
    db: AsyncSession,
) -> None:
    if not await can_write_audit_engagement(user, project, db):
        raise PermissionError("forbidden")


async def require_audit_engagement_read(
    user: User,
    project: PlantingProject,
    db: AsyncSession,
) -> None:
    if not await can_read_audit_engagement(user, project, db):
        raise PermissionError("forbidden")


async def require_audit_engagement_verify(
    user: User,
    project: PlantingProject,
    db: AsyncSession,
) -> None:
    if not await can_verify_audit_export(user, project, db):
        raise PermissionError("forbidden")
