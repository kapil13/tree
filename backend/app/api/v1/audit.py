"""Audit log query endpoints."""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.v1.deps import DB, AuditReader, CurrentUser
from app.core.security import Permission, has_permission
from app.models.audit import AuditLog
from app.models.audit_chain_root import AuditChainRoot
from app.schemas.audit import AuditLogOut
from app.schemas.common import Page
from app.services.audit.chain import chain_stats, verify_audit_chain
from app.services.platform.modules import USERS_ADMIN_MODULE, user_can_access_module

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs", response_model=Page[AuditLogOut])
async def list_audit_logs(
    user: AuditReader,
    db: DB,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: str | None = None,
    action_prefix: str | None = None,
    resource_type: str | None = None,
    resource_id: uuid.UUID | None = None,
) -> Page[AuditLogOut]:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())

    is_platform_viewer = has_permission(user.role, Permission.ADMIN_ALL)
    if not is_platform_viewer:
        is_platform_viewer = await user_can_access_module(
            db, role=user.role, module_key=USERS_ADMIN_MODULE, user_id=user.id
        )
    if not is_platform_viewer:
        if user.organization_id is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
        stmt = stmt.where(AuditLog.organization_id == user.organization_id)

    if action_prefix:
        stmt = stmt.where(AuditLog.action.startswith(action_prefix))
    elif action:
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
            prev_hash=r.prev_hash,
            record_hash=r.record_hash,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/chain/stats")
async def audit_chain_statistics(user: AuditReader, db: DB) -> dict[str, object]:
    is_platform_viewer = has_permission(user.role, Permission.ADMIN_ALL)
    if not is_platform_viewer:
        is_platform_viewer = await user_can_access_module(
            db, role=user.role, module_key=USERS_ADMIN_MODULE, user_id=user.id
        )
    if not is_platform_viewer:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    return await chain_stats(db)


@router.get("/chain/verify")
async def verify_audit_chain_endpoint(
    user: AuditReader,
    db: DB,
    organization_id: uuid.UUID | None = None,
    limit: int | None = Query(None, ge=1, le=100_000),
) -> dict[str, object]:
    is_platform_viewer = has_permission(user.role, Permission.ADMIN_ALL)
    if not is_platform_viewer:
        is_platform_viewer = await user_can_access_module(
            db, role=user.role, module_key=USERS_ADMIN_MODULE, user_id=user.id
        )
    if not is_platform_viewer:
        if user.organization_id is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
        organization_id = user.organization_id
    return await verify_audit_chain(db, organization_id=organization_id, limit=limit)


@router.get("/chain/roots/{chain_date}")
async def get_audit_chain_root(
    chain_date: date,
    user: CurrentUser,
    db: DB,
) -> dict[str, object]:
    is_platform_viewer = has_permission(user.role, Permission.ADMIN_ALL)
    if not is_platform_viewer:
        is_platform_viewer = await user_can_access_module(
            db, role=user.role, module_key=USERS_ADMIN_MODULE, user_id=user.id
        )
    if not is_platform_viewer:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    root = (
        await db.execute(select(AuditChainRoot).where(AuditChainRoot.chain_date == chain_date))
    ).scalar_one_or_none()
    if root is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="root_not_found")
    return {
        "chain_date": root.chain_date.isoformat(),
        "root_hash": root.root_hash,
        "record_count": root.record_count,
        "published_at": root.published_at.isoformat() if root.published_at else None,
        "s3_key": root.s3_key,
    }
