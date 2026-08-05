"""Centralized portfolio data scoping by role and organization membership."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

if TYPE_CHECKING:
    from app.models.tree import Tree
    from app.models.user import User

PROFESSIONAL_PLATFORM_ROLES = frozenset({"government", "corporate", "ngo", "field_supervisor"})
CITIZEN_PLATFORM_ROLES = frozenset({"user", "farmer"})


def user_sees_org_portfolio(user: User) -> bool:
    """Whether the user should see organization-wide portfolio data."""
    if user.role == "admin":
        return True
    if user.role in PROFESSIONAL_PLATFORM_ROLES:
        return True
    if user.is_org_admin:
        return True
    return user.org_role in ("manager", "supervisor")


def user_is_field_worker(user: User) -> bool:
    return user.role == "field_worker" or user.org_role == "worker"


def apply_owner_org_scope(
    stmt: Select,
    user: User,
    *,
    owner_col,
    org_col,
) -> Select:
    """Scope rows with owner_user_id + organization_id columns."""
    if user.role == "admin":
        return stmt
    if user_sees_org_portfolio(user) and user.organization_id:
        return stmt.where(
            (owner_col == user.id) | (org_col == user.organization_id)
        )
    return stmt.where(owner_col == user.id)


async def apply_tree_scope(stmt: Select, user: User, db: AsyncSession) -> Select:
    from app.models.tree import Tree

    if user.role == "admin":
        return stmt
    if user_is_field_worker(user):
        from app.services.planting_projects.access import list_accessible_project_ids

        project_ids = await list_accessible_project_ids(user, db)
        clauses = [Tree.owner_user_id == user.id]
        if project_ids:
            clauses.append(Tree.project_id.in_(project_ids))
        return stmt.where(or_(*clauses))
    return apply_owner_org_scope(
        stmt,
        user,
        owner_col=Tree.owner_user_id,
        org_col=Tree.organization_id,
    )


async def can_access_tree(db: AsyncSession, user: User, tree: Tree) -> bool:
    if user.role == "admin":
        return True
    if tree.owner_user_id == user.id:
        return True
    from app.models.tree_steward import TreeSteward

    steward = (
        await db.execute(
            select(TreeSteward.id).where(
                TreeSteward.tree_id == tree.id, TreeSteward.user_id == user.id
            )
        )
    ).scalar_one_or_none()
    if steward is not None:
        return True
    if user_sees_org_portfolio(user) and user.organization_id:
        return tree.organization_id == user.organization_id
    if user_is_field_worker(user) and tree.project_id:
        from app.services.planting_projects.access import list_accessible_project_ids

        project_ids = await list_accessible_project_ids(user, db)
        return project_ids is not None and tree.project_id in project_ids
    return False


async def field_worker_project_ids(user: User, db: AsyncSession) -> set[uuid.UUID]:
    from app.services.planting_projects.access import list_accessible_project_ids

    ids = await list_accessible_project_ids(user, db)
    return ids or set()


async def mvt_tree_scope_binds(user: User, db: AsyncSession) -> dict:
    """Bind parameters for MVT tile SQL (mirrors apply_tree_scope)."""
    binds: dict = {
        "is_admin": user.role == "admin",
        "uid": user.id,
        "oid": user.organization_id,
        "org_portfolio": False,
        "is_field_worker": False,
        "project_ids": [],
    }
    if user.role == "admin":
        return binds
    if user_is_field_worker(user):
        binds["is_field_worker"] = True
        binds["project_ids"] = [str(x) for x in await field_worker_project_ids(user, db)]
        return binds
    if user_sees_org_portfolio(user) and user.organization_id:
        binds["org_portfolio"] = True
    return binds
