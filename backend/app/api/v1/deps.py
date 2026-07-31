"""Shared FastAPI dependencies."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac_policy import professional_roles
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
from app.services.platform.modules import (
    BILLING_ADMIN_MODULE,
    OPS_ADMIN_MODULE,
    PROGRAM_ACCESS_ADMIN_MODULE,
    USERS_ADMIN_MODULE,
    WEBSITE_CMS_MODULE,
    build_platform_access_map,
    user_can_access_module,
)

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
    if user.organization_id is not None:
        from app.models.organization import Organization

        org = await db.get(Organization, user.organization_id)
        if org is not None and not org.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="organization_suspended")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DB = Annotated[AsyncSession, Depends(get_db)]


async def require_platform_admin(user: CurrentUser) -> User:
    if not has_permission(user.role, Permission.ADMIN_ALL):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="platform_admin_required")
    return user


PlatformAdmin = Annotated[User, Depends(require_platform_admin)]


async def _require_module(user: User, db: AsyncSession, module_key: str) -> User:
    if has_permission(user.role, Permission.ADMIN_ALL):
        return user
    if await user_can_access_module(db, role=user.role, module_key=module_key):
        return user
    raise HTTPException(
        status.HTTP_403_FORBIDDEN, detail=f"platform_module_denied:{module_key}"
    )


async def require_users_module(user: CurrentUser, db: DB) -> User:
    return await _require_module(user, db, USERS_ADMIN_MODULE)


UsersModuleAdmin = Annotated[User, Depends(require_users_module)]


async def require_program_access_module(user: CurrentUser, db: DB) -> User:
    return await _require_module(user, db, PROGRAM_ACCESS_ADMIN_MODULE)


ProgramAccessModuleAdmin = Annotated[User, Depends(require_program_access_module)]


async def require_ops_module(user: CurrentUser, db: DB) -> User:
    return await _require_module(user, db, OPS_ADMIN_MODULE)


OpsModuleAdmin = Annotated[User, Depends(require_ops_module)]


async def require_billing_module(user: CurrentUser, db: DB) -> User:
    return await _require_module(user, db, BILLING_ADMIN_MODULE)


BillingModuleAdmin = Annotated[User, Depends(require_billing_module)]


async def require_any_platform_module(user: CurrentUser, db: DB) -> User:
    if has_permission(user.role, Permission.ADMIN_ALL):
        return user
    access = await build_platform_access_map(db, role=user.role)
    if any(access.values()):
        return user
    raise HTTPException(status.HTTP_403_FORBIDDEN, detail="platform_access_denied")


AnyPlatformModule = Annotated[User, Depends(require_any_platform_module)]


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

PROFESSIONAL_ROLES = professional_roles()


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


async def require_audit_reader(user: CurrentUser, db: DB) -> User:
    if has_permission(user.role, Permission.ADMIN_ALL):
        return user
    if await user_can_access_module(db, role=user.role, module_key=USERS_ADMIN_MODULE):
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


def require_write_perm(perm: Permission):
    """Write access plus a specific Permission (org viewers blocked)."""

    async def dep(user: CurrentUser) -> User:
        if not user_can_write(user):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="viewer_read_only")
        if not has_permission(user.role, perm):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
        return user

    return Depends(dep)
