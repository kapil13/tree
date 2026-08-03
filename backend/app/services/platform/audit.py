"""Platform-wide audit log queries and export."""

from __future__ import annotations

import csv
import io
import json
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.user import User


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
                User.email.ilike(q),
                User.full_name.ilike(q),
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
    base = (
        select(AuditLog, User.email, User.full_name)
        .outerjoin(User, AuditLog.actor_user_id == User.id)
        .order_by(AuditLog.created_at.desc())
    )
    base = _apply_audit_filters(
        base,
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
    total = int((await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one())
    page_size = min(max(page_size, 1), 200)
    page = max(page, 1)
    rows = (await db.execute(base.offset((page - 1) * page_size).limit(page_size))).all()
    items = [
        {
            "id": row[0].id,
            "actor_user_id": row[0].actor_user_id,
            "actor_email": row[1],
            "actor_full_name": row[2],
            "organization_id": row[0].organization_id,
            "action": row[0].action,
            "resource_type": row[0].resource_type,
            "resource_id": row[0].resource_id,
            "ip": str(row[0].ip) if row[0].ip is not None else None,
            "user_agent": row[0].user_agent,
            "diff": row[0].diff,
            "created_at": row[0].created_at,
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
    base = (
        select(AuditLog, User.email, User.full_name)
        .outerjoin(User, AuditLog.actor_user_id == User.id)
        .order_by(AuditLog.created_at.desc())
        .limit(min(limit, 10000))
    )
    base = _apply_audit_filters(base, **filters)
    rows = (await db.execute(base)).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "created_at",
            "action",
            "actor_email",
            "actor_user_id",
            "organization_id",
            "resource_type",
            "resource_id",
            "ip",
            "diff_json",
        ]
    )
    for log, email, _name in rows:
        writer.writerow(
            [
                log.created_at.isoformat() if log.created_at else "",
                log.action,
                email or "",
                str(log.actor_user_id) if log.actor_user_id else "",
                str(log.organization_id) if log.organization_id else "",
                log.resource_type or "",
                str(log.resource_id) if log.resource_id else "",
                str(log.ip) if log.ip is not None else "",
                json.dumps(log.diff or {}, ensure_ascii=False),
            ]
        )
    return buf.getvalue()
