"""Support impersonation — short-lived tokens for platform admins."""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.models.user import User

IMPERSONATION_TTL_MINUTES = 30


class ImpersonationError(Exception):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def impersonation_token_for(*, admin: User, target: User, read_only: bool = False) -> dict:
    extra: dict[str, str] = {"imp_by": str(admin.id)}
    if read_only:
        extra["imp_ro"] = True
    access_token = create_access_token(
        target.id,
        role=target.role,
        org_id=target.organization_id,
        expires_delta=timedelta(minutes=IMPERSONATION_TTL_MINUTES),
        extra=extra,
    )
    return {
        "access_token": access_token,
        "refresh_token": create_refresh_token(admin.id),
        "token_type": "Bearer",
        "expires_in": IMPERSONATION_TTL_MINUTES * 60,
        "impersonated_by_id": admin.id,
        "impersonated_by_email": admin.email,
        "read_only": read_only,
    }


async def validate_impersonation_target(
    db: AsyncSession, *, admin: User, target: User
) -> None:
    if target.id == admin.id:
        raise ImpersonationError("cannot_impersonate_self")
    if not target.is_active:
        raise ImpersonationError("target_inactive")
    if target.role == "admin":
        raise ImpersonationError("cannot_impersonate_admin")


def admin_tokens_for(admin: User) -> dict:
    return {
        "access_token": create_access_token(
            admin.id, role=admin.role, org_id=admin.organization_id
        ),
        "refresh_token": create_refresh_token(admin.id),
        "token_type": "Bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
    }
