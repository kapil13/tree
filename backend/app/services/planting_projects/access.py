"""Access control for planting projects, work areas, and contractor teams."""

from __future__ import annotations

import uuid

from sqlalchemy import or_, select

from app.models.planting_project import PlantingProject
from app.models.plantation_fence import PlantationFence
from app.models.project_member import ProjectMember

FIELD_ROLES = frozenset({"field_supervisor", "field_worker"})
PROJECT_MANAGE_ROLES = frozenset({"field_supervisor"})


async def get_project_membership(user, project_id: uuid.UUID, db) -> ProjectMember | None:
    res = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
        )
    )
    return res.scalar_one_or_none()


def _is_org_member(user, project: PlantingProject) -> bool:
    return bool(user.organization_id and project.organization_id == user.organization_id)


async def can_access_project(user, project: PlantingProject, db) -> bool:
    if user.role == "admin":
        return True
    if project.owner_user_id == user.id:
        return True
    if _is_org_member(user, project):
        return True
    membership = await get_project_membership(user, project.id, db)
    return membership is not None


async def can_manage_project(user, project: PlantingProject, db) -> bool:
    if user.role == "admin":
        return True
    if project.owner_user_id == user.id:
        return True
    if _is_org_member(user, project) and user.role in ("government", "corporate", "admin"):
        return True
    membership = await get_project_membership(user, project.id, db)
    return membership is not None and membership.role in PROJECT_MANAGE_ROLES


def can_access_work_area(user, fence: PlantationFence, membership: ProjectMember | None) -> bool:
    if user.role == "admin":
        return True
    if fence.owner_user_id == user.id:
        return True
    if user.organization_id and fence.organization_id == user.organization_id:
        return True
    if membership is None:
        return False
    allowed = membership.work_area_ids
    if not allowed:
        return True
    return str(fence.id) in {str(wid) for wid in allowed}


async def load_project(project_id: uuid.UUID, user, db) -> PlantingProject | None:
    res = await db.execute(select(PlantingProject).where(PlantingProject.id == project_id))
    project = res.scalar_one_or_none()
    if project is None or not await can_access_project(user, project, db):
        return None
    return project


async def load_work_area(work_area_id: uuid.UUID, user, db) -> PlantationFence | None:
    res = await db.execute(select(PlantationFence).where(PlantationFence.id == work_area_id))
    fence = res.scalar_one_or_none()
    if fence is None:
        return None
    if user.role == "admin":
        return fence
    if fence.owner_user_id == user.id:
        return fence
    if user.organization_id and fence.organization_id == user.organization_id:
        return fence
    if fence.project_id:
        proj_res = await db.execute(
            select(PlantingProject).where(PlantingProject.id == fence.project_id)
        )
        project = proj_res.scalar_one_or_none()
        if project is None:
            return None
        if project.owner_user_id == user.id:
            return fence
        if _is_org_member(user, project):
            return fence
        membership = await get_project_membership(user, project.id, db)
        if membership and can_access_work_area(user, fence, membership):
            return fence
        return None
    return None


async def list_accessible_project_ids(user, db) -> set[uuid.UUID] | None:
    """Return project IDs the user can access, or None if admin (no filter)."""
    if user.role == "admin":
        return None
    ids: set[uuid.UUID] = set()
    if user.organization_id:
        org_rows = (
            await db.execute(
                select(PlantingProject.id).where(
                    PlantingProject.organization_id == user.organization_id
                )
            )
        ).scalars().all()
        ids.update(org_rows)
    owner_rows = (
        await db.execute(
            select(PlantingProject.id).where(PlantingProject.owner_user_id == user.id)
        )
    ).scalars().all()
    ids.update(owner_rows)
    member_rows = (
        await db.execute(select(ProjectMember.project_id).where(ProjectMember.user_id == user.id))
    ).scalars().all()
    ids.update(member_rows)
    return ids


def project_list_filter(user, stmt):
    if user.role == "admin":
        return stmt
    clauses = [PlantingProject.owner_user_id == user.id]
    if user.organization_id:
        clauses.append(PlantingProject.organization_id == user.organization_id)
    member_subq = select(ProjectMember.project_id).where(ProjectMember.user_id == user.id)
    clauses.append(PlantingProject.id.in_(member_subq))
    return stmt.where(or_(*clauses))
