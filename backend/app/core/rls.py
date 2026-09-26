"""PostgreSQL row-level security session context (Platform Foundation E2)."""

from __future__ import annotations

import os
import uuid
from contextvars import ContextVar
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

_NULL_UUID = "00000000-0000-0000-0000-000000000000"


@dataclass(frozen=True)
class RLSContext:
    user_id: uuid.UUID | None = None
    organization_id: uuid.UUID | None = None
    role: str = "anonymous"  # anonymous | user | admin | service


_rls_ctx: ContextVar[RLSContext | None] = ContextVar("byot_rls_ctx", default=None)


def set_rls_context(
    *,
    user_id: uuid.UUID | None = None,
    organization_id: uuid.UUID | None = None,
    role: str = "user",
) -> None:
    _rls_ctx.set(
        RLSContext(
            user_id=user_id,
            organization_id=organization_id,
            role=role,
        )
    )


def set_rls_from_user(user) -> None:
    """Bind RLS from an authenticated User ORM instance."""
    role = "admin" if getattr(user, "role", None) == "admin" else "user"
    set_rls_context(
        user_id=getattr(user, "id", None),
        organization_id=getattr(user, "organization_id", None),
        role=role,
    )


def set_service_rls_context() -> None:
    _rls_ctx.set(RLSContext(role="service"))


def clear_rls_context() -> None:
    _rls_ctx.set(None)


def current_rls_context() -> RLSContext:
    ctx = _rls_ctx.get()
    if ctx is not None:
        return ctx
    if settings.app_env == "test":
        return RLSContext(role="admin")
    if os.environ.get("CELERY_WORKER") == "1":
        return RLSContext(role="service")
    return RLSContext(role="anonymous")


async def apply_rls_to_session(session: AsyncSession) -> None:
    """SET LOCAL GUCs consumed by RLS policies (see migration 0087)."""
    if not settings.rls_enabled:
        return

    ctx = current_rls_context()
    user_id = str(ctx.user_id or _NULL_UUID)
    org_id = str(ctx.organization_id or _NULL_UUID)
    await session.execute(
        text(
            "SELECT set_config('byot.current_user_id', :uid, true), "
            "set_config('byot.current_org_id', :oid, true), "
            "set_config('byot.current_role', :role, true)"
        ),
        {"uid": user_id, "oid": org_id, "role": ctx.role},
    )
