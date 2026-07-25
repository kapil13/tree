"""Shared FastAPI dependencies."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    Permission,
    TokenType,
    decode_token,
    has_permission,
    user_can_write,
)
from app.models.user import User
from app.services.auth.user_profile import user_has_professional_program
from app.services.planting_programs.enrollment import list_user_program_codes
from app.services.platform.modules import WEBSITE_CMS_MODULE, user_can_access_module

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="missing_token")
    try:
        payload = decode_token(creds.credentials)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_token") from None
    if payload.get("type") != TokenType.ACCESS.value:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="wrong_token_type")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    res = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = res.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="inactive_user")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DB = Annotated[AsyncSession, Depends(get_db)]


async def require_platform_admin(user: CurrentUser) -> User:
    if not has_permission(user.role, Permission.PLATFORM_USERS_MANAGE):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="platform_admin_required")
    return user


PlatformAdmin = Annotated[User, Depends(require_platform_admin)]


async def require_cms_manager(user: CurrentUser, db: DB) -> User:
    if has_permission(user.role, Permission.CMS_MANAGE):
        return user
    if await user_can_access_module(db, role=user.role, module_key=WEBSITE_CMS_MODULE):
        return user
    raise HTTPException(status.HTTP_403_FORBIDDEN, detail="cms_access_denied")


CmsManager = Annotated[User, Depends(require_cms_manager)]


async def require_org_admin(user: CurrentUser) -> User:
    if user.role == "admin":
        return user
    if not user.organization_id or not user.is_org_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="org_admin_required")
    return user


OrgAdmin = Annotated[User, Depends(require_org_admin)]


async def require_org_member(user: CurrentUser) -> User:
    if user.role == "admin":
        return user
    if not user.organization_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="org_member_required")
    return user


OrgMember = Annotated[User, Depends(require_org_member)]


async def require_write_access(user: CurrentUser) -> User:
    if not user_can_write(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="viewer_read_only")
    return user


WriteAccess = Annotated[User, Depends(require_write_access)]

PROFESSIONAL_ROLES = frozenset({"government", "corporate", "ngo", "field_supervisor"})


def user_has_professional_role(user: User) -> bool:
    if user.role == "admin":
        return True
    return user.role in PROFESSIONAL_ROLES


async def require_professional_access(user: CurrentUser, db: DB) -> User:
    if user_has_professional_role(user):
        return user
    codes = await list_user_program_codes(db, user.id)
    if user_has_professional_program(codes):
        return user
    raise HTTPException(status.HTTP_403_FORBIDDEN, detail="professional_access_required")


ProfessionalAccess = Annotated[User, Depends(require_professional_access)]


async def require_write_professional(user: CurrentUser, db: DB) -> User:
    if not user_can_write(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="viewer_read_only")
    return await require_professional_access(user, db)


WriteProfessional = Annotated[User, Depends(require_write_professional)]


async def require_audit_reader(user: CurrentUser) -> User:
    if user.role == "admin":
        return user
    if user.organization_id and user.is_org_admin:
        return user
    if has_permission(user.role, Permission.AUDIT_READ):
        return user
    raise HTTPException(status.HTTP_403_FORBIDDEN, detail="audit_access_denied")


AuditReader = Annotated[User, Depends(require_audit_reader)]


def require(perm: Permission):
    async def dep(user: CurrentUser) -> User:
        if not has_permission(user.role, perm):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
        return user

    return Depends(dep)
