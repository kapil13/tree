"""Platform admin helpers — overview stats and user directory."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.planting_program import ProgramAccessRequest
from app.models.user import User
from app.services.planting_programs.enrollment import list_user_program_codes


async def build_platform_overview(db: AsyncSession) -> dict[str, Any]:
    total_users = int((await db.execute(select(func.count()).select_from(User))).scalar_one())
    active_users = int(
        (await db.execute(select(func.count()).select_from(User).where(User.is_active.is_(True)))).scalar_one()
    )
    total_orgs = int((await db.execute(select(func.count()).select_from(Organization))).scalar_one())
    pending_requests = int(
        (
            await db.execute(
                select(func.count()).select_from(ProgramAccessRequest).where(
                    ProgramAccessRequest.status == "pending"
                )
            )
        ).scalar_one()
    )
    admin_users = int(
        (await db.execute(select(func.count()).select_from(User).where(User.role == "admin"))).scalar_one()
    )
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": total_users - active_users,
            "admins": admin_users,
        },
        "organizations": {"total": total_orgs},
        "program_access": {"pending": pending_requests},
    }


async def query_platform_users(
    db: AsyncSession,
    *,
    search: str = "",
    role: str | None = None,
    is_active: bool | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[dict[str, Any]], int]:
    base = (
        select(User, Organization.name.label("organization_name"))
        .outerjoin(Organization, Organization.id == User.organization_id)
        .order_by(User.created_at.desc())
    )
    if search.strip():
        q = f"%{search.strip()}%"
        base = base.where(or_(User.email.ilike(q), User.full_name.ilike(q)))
    if role:
        base = base.where(User.role == role)
    if is_active is not None:
        base = base.where(User.is_active.is_(is_active))

    count_stmt = select(func.count()).select_from(base.subquery())
    total = int((await db.execute(count_stmt)).scalar_one())

    page_size = min(max(page_size, 1), 100)
    page = max(page, 1)
    rows = (
        await db.execute(base.offset((page - 1) * page_size).limit(page_size))
    ).all()

    items: list[dict[str, Any]] = []
    for user, organization_name in rows:
        programs = await list_user_program_codes(db, user.id)
        items.append(
            {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "organization_id": user.organization_id,
                "organization_name": organization_name,
                "org_role": user.org_role,
                "is_org_admin": user.is_org_admin,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "created_at": user.created_at,
                "last_login_at": user.last_login_at,
                "enrolled_program_codes": programs,
            }
        )
    return items, total


async def get_platform_user(db: AsyncSession, user_id: uuid.UUID) -> dict[str, Any] | None:
    row = (
        await db.execute(
            select(User, Organization.name.label("organization_name"))
            .outerjoin(Organization, Organization.id == User.organization_id)
            .where(User.id == user_id)
        )
    ).one_or_none()
    if row is None:
        return None
    user, organization_name = row
    programs = await list_user_program_codes(db, user.id)
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "organization_id": user.organization_id,
        "organization_name": organization_name,
        "org_role": user.org_role,
        "is_org_admin": user.is_org_admin,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "created_at": user.created_at,
        "last_login_at": user.last_login_at,
        "enrolled_program_codes": programs,
    }
