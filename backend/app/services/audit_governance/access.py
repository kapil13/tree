"""Audit engagement access controls (Wave A / P22 partial)."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_project import PlantingProject
from app.models.user import User
from app.services.planting_projects.access import can_manage_project


async def require_audit_engagement_write(
    user: User,
    project: PlantingProject,
    db: AsyncSession,
) -> None:
    """Centralized write guard for Estate Watch mutation endpoints."""
    if not await can_manage_project(user, project, db):
        raise PermissionError("forbidden")


async def require_audit_engagement_read(
    user: User,
    project: PlantingProject,
    db: AsyncSession,
) -> None:
    """Read access mirrors project visibility for Wave A."""
    if project is None:
        raise PermissionError("project_not_found")
    if not await can_manage_project(user, project, db):
        raise PermissionError("forbidden")
