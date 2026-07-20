"""Append-only audit trail writer."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.user import User
from app.services.audit.request import client_ip, client_user_agent


async def record_audit(
    db: AsyncSession,
    *,
    action: str,
    actor: User | None = None,
    actor_user_id: uuid.UUID | None = None,
    organization_id: uuid.UUID | None = None,
    resource_type: str | None = None,
    resource_id: uuid.UUID | None = None,
    diff: dict[str, Any] | None = None,
    request: Request | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    """Persist an audit event. Caller must commit the session."""
    user_id = actor_user_id or (actor.id if actor else None)
    org_id = organization_id or (actor.organization_id if actor else None)

    entry = AuditLog(
        actor_user_id=user_id,
        organization_id=org_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip=ip if ip is not None else client_ip(request),
        user_agent=user_agent if user_agent is not None else client_user_agent(request),
        diff=diff,
    )
    db.add(entry)
    return entry
