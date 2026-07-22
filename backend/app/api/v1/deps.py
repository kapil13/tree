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
)
from app.models.user import User
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


def require(perm: Permission):
    async def dep(user: CurrentUser) -> User:
        if not has_permission(user.role, perm):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
        return user

    return Depends(dep)
