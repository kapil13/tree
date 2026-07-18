"""Access control for planting projects and work areas."""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.models.planting_project import PlantingProject
from app.models.plantation_fence import PlantationFence


def can_access_project(user, project: PlantingProject) -> bool:
    if user.role == "admin":
        return True
    if project.owner_user_id == user.id:
        return True
    return bool(user.organization_id and project.organization_id == user.organization_id)


def can_access_fence(user, fence: PlantationFence) -> bool:
    if user.role == "admin":
        return True
    if fence.owner_user_id == user.id:
        return True
    return bool(user.organization_id and fence.organization_id == user.organization_id)


async def load_project(project_id: uuid.UUID, user, db) -> PlantingProject | None:
    res = await db.execute(select(PlantingProject).where(PlantingProject.id == project_id))
    project = res.scalar_one_or_none()
    if project is None or not can_access_project(user, project):
        return None
    return project


async def load_work_area(work_area_id: uuid.UUID, user, db) -> PlantationFence | None:
    res = await db.execute(select(PlantationFence).where(PlantationFence.id == work_area_id))
    fence = res.scalar_one_or_none()
    if fence is None or not can_access_fence(user, fence):
        return None
    return fence
