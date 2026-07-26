"""Organization access checks for auth and request dependencies."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.user import User


async def assert_user_may_authenticate(db: AsyncSession, user: User) -> None:
    """Reject inactive users and members of suspended organizations."""
    if not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="inactive_user")
    if user.organization_id is None:
        return
    org = await db.get(Organization, user.organization_id)
    if org is not None and not org.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="organization_suspended")


async def org_is_active(db: AsyncSession, organization_id: uuid.UUID | None) -> bool:
    if organization_id is None:
        return True
    org = await db.get(Organization, organization_id)
    if org is None:
        return True
    return bool(org.is_active)
