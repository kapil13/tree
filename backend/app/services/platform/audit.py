"""Platform-wide audit log queries and export."""

from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


def _apply_audit_filters(
    stmt,
    *,
    action: str | None = None,
    action_prefix: str | None = None,
    resource_type: str | None = None,
    resource_id: uuid.UUID | None = None,
    organization_id: uuid.UUID | None = None,
    actor_user_id: uuid.UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
):
    if action_prefix:
        stmt = stmt.where(AuditLog.action.startswith(action_prefix))
    elif action:
        stmt = stmt.where(AuditLog.action == action)
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)
    if resource_id:
        stmt = stmt.where(AuditLog.resource_id == resource_id)
    if organization_id:
        stmt = stmt.where(AuditLog.organization_id == organization_id)
    if actor_user_id:
        stmt = stmt.where(AuditLog.actor_user_id == actor_user_id)
    if date_from:
        stmt = stmt.where(AuditLog.created_at >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.created_at <= date_to)
    if search and search.strip():
        q = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                AuditLog.action.ilike(q),
                AuditLog.resource_type.ilike(q),
            )
        )
    return stmt


async def query_platform_audit_logs(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
    action: str | None = None,
    action_prefix: str | None = None,
    resource_type: str | None = None,
    resource_id: uuid.UUID | None = None,
    organization_id: uuid.UUID | None = None,
    actor_user_id: uuid.UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    search: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    stmt = _apply_audit_filters(
        stmt,
        action=action,
        action_prefix=action_prefix,
        resource_type=resource_type,
        resource_id=resource_id,
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )
    total = int((await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one())
    page_size = min(max(page_size, 1), 200)
    page = max(page, 1)
    rows = (await db.execute(stmt.offset((page - 1) * page_size).limit(page_size))).scalars().all()
    items = [
        {
            "id": row.id,
            "actor_user_id": row.actor_user_id,
            "organization_id": row.organization_id,
            "action": row.action,
            "resource_type": row.resource_type,
            "resource_id": row.resource_id,
            "ip": str(row.ip) if row.ip is not None else None,
            "user_agent": row.user_agent,
            "diff": row.diff,
            "created_at": row.created_at,
        }
        for row in rows
    ]
    return items, total


async def export_platform_audit_csv(
    db: AsyncSession,
    *,
    limit: int = 5000,
    **filters: Any,
) -> str:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(min(limit, 10000))
    stmt = _apply_audit_filters(stmt, **filters)
    rows = (await db.execute(stmt)).scalars().all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "created_at",
            "action",
            "actor_user_id",
            "organization_id",
            "resource_type",
            "resource_id",
            "ip",
        ]
    )
    for row in rows:
        writer.writerow(
            [
                row.created_at.isoformat() if row.created_at else "",
                row.action,
                str(row.actor_user_id) if row.actor_user_id else "",
                str(row.organization_id) if row.organization_id else "",
                row.resource_type or "",
                str(row.resource_id) if row.resource_id else "",
                str(row.ip) if row.ip is not None else "",
            ]
        )
    return buf.getvalue()
