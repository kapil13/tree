"""Platform admin bulk operations."""

from __future__ import annotations

import uuid
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import Permission, has_permission
from app.models.organization import Organization
from app.models.user import User
from app.services.platform.support import admin_revoke_sessions

UserBulkAction = Literal["activate", "deactivate", "revoke_sessions"]


class BulkOpsError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


async def revoke_org_member_sessions(db: AsyncSession, org_id: uuid.UUID) -> int:
    members = (
        await db.execute(select(User).where(User.organization_id == org_id))
    ).scalars().all()
    for member in members:
        admin_revoke_sessions(member)
    await db.flush()
    return len(members)


async def bulk_update_users(
    db: AsyncSession,
    *,
    actor: User,
    user_ids: list[uuid.UUID],
    action: UserBulkAction,
) -> dict[str, Any]:
    if not user_ids:
        raise BulkOpsError("empty_selection")

    is_full_admin = has_permission(actor.role, Permission.ADMIN_ALL)
    processed = 0
    skipped = 0
    details: list[dict[str, Any]] = []

    for user_id in user_ids:
        user = await db.get(User, user_id)
        if user is None:
            skipped += 1
            details.append({"user_id": str(user_id), "status": "not_found"})
            continue

        if user.id == actor.id and action in ("deactivate", "revoke_sessions"):
            skipped += 1
            details.append({"user_id": str(user_id), "status": "skipped_self"})
            continue

        if not is_full_admin and user.role == "admin":
            skipped += 1
            details.append({"user_id": str(user_id), "status": "skipped_admin"})
            continue

        if action == "activate":
            user.is_active = True
            processed += 1
            details.append({"user_id": str(user_id), "status": "activated"})
        elif action == "deactivate":
            user.is_active = False
            processed += 1
            details.append({"user_id": str(user_id), "status": "deactivated"})
        elif action == "revoke_sessions":
            admin_revoke_sessions(user)
            processed += 1
            details.append({"user_id": str(user_id), "status": "sessions_revoked"})

    await db.flush()
    return {"processed": processed, "skipped": skipped, "details": details}


async def bulk_update_organizations(
    db: AsyncSession,
    *,
    org_ids: list[uuid.UUID],
    is_active: bool,
    revoke_member_sessions: bool = False,
) -> dict[str, Any]:
    if not org_ids:
        raise BulkOpsError("empty_selection")

    processed = 0
    skipped = 0
    details: list[dict[str, Any]] = []
    sessions_revoked = 0

    for org_id in org_ids:
        org = await db.get(Organization, org_id)
        if org is None:
            skipped += 1
            details.append({"org_id": str(org_id), "status": "not_found"})
            continue

        org.is_active = is_active
        member_count = 0
        if is_active is False and revoke_member_sessions:
            member_count = await revoke_org_member_sessions(db, org.id)
            sessions_revoked += member_count

        processed += 1
        details.append(
            {
                "org_id": str(org_id),
                "status": "activated" if is_active else "suspended",
                "sessions_revoked": member_count,
            }
        )

    await db.flush()
    return {
        "processed": processed,
        "skipped": skipped,
        "sessions_revoked": sessions_revoked,
        "details": details,
    }
