"""Audit log query endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.v1.deps import DB, CurrentUser, require
from app.core.security import Permission
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogOut
from app.schemas.common import Page

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs", response_model=Page[AuditLogOut], dependencies=[require(Permission.AUDIT_READ)])
async def list_audit_logs(
    user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: str | None = None,
    resource_type: str | None = None,
    resource_id: uuid.UUID | None = None,
) -> Page[AuditLogOut]:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())

    if user.role != "admin":
        if user.organization_id is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
        stmt = stmt.where(AuditLog.organization_id == user.organization_id)
    elif user.organization_id:
        stmt = stmt.where(AuditLog.organization_id == user.organization_id)

    if action:
        stmt = stmt.where(AuditLog.action == action)
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)
    if resource_id:
        stmt = stmt.where(AuditLog.resource_id == resource_id)

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (
        await db.execute(stmt.offset((page - 1) * page_size).limit(page_size))
    ).scalars().all()

    items = [
        AuditLogOut(
            id=r.id,
            actor_user_id=r.actor_user_id,
            organization_id=r.organization_id,
            action=r.action,
            resource_type=r.resource_type,
            resource_id=r.resource_id,
            ip=str(r.ip) if r.ip is not None else None,
            user_agent=r.user_agent,
            diff=r.diff,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)
