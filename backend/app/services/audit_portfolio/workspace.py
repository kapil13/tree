"""P13 — auditor workspace queue and saved views."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement
from app.models.audit_portfolio_ops import AuditAuditorWorkspaceView
from app.services.audit_portfolio.field_plot_queue import build_audit_field_plot_queue


async def build_auditor_workspace(
    db: AsyncSession,
    user,
    *,
    project_id: uuid.UUID | None = None,
    risk_level: str | None = None,
    engagement_status: str | None = None,
    limit: int = 100,
) -> dict[str, Any]:
    """Multi-estate field queue with optional filters for auditor workspace."""
    queue = await build_audit_field_plot_queue(
        db, user, project_id=project_id, limit=limit, active_plan_only=True
    )
    items = queue.get("items") or []

    if risk_level:
        items = [item for item in items if item.get("risk_level") == risk_level]
    if engagement_status:
        items = [item for item in items if item.get("engagement_status") == engagement_status]

    engagement_ids = {item["engagement_id"] for item in items}
    engagements = {}
    if engagement_ids:
        rows = (
            await db.execute(
                select(AuditEngagement).where(
                    AuditEngagement.id.in_([uuid.UUID(eid) for eid in engagement_ids])
                )
            )
        ).scalars().all()
        engagements = {str(e.id): e.status for e in rows}

    return {
        "total_due": len(items),
        "items": items,
        "filters": {
            "project_id": str(project_id) if project_id else None,
            "risk_level": risk_level,
            "engagement_status": engagement_status,
        },
        "engagement_statuses": engagements,
    }


async def save_workspace_view(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    name: str,
    filters: dict[str, Any],
    is_default: bool = False,
) -> AuditAuditorWorkspaceView:
    existing = (
        await db.execute(
            select(AuditAuditorWorkspaceView).where(
                AuditAuditorWorkspaceView.user_id == user_id,
                AuditAuditorWorkspaceView.name == name,
            )
        )
    ).scalar_one_or_none()

    if is_default:
        defaults = (
            await db.execute(
                select(AuditAuditorWorkspaceView).where(
                    AuditAuditorWorkspaceView.user_id == user_id,
                    AuditAuditorWorkspaceView.is_default.is_(True),
                )
            )
        ).scalars().all()
        for row in defaults:
            row.is_default = False

    if existing:
        existing.filters = filters
        existing.is_default = is_default
        await db.flush()
        return existing

    row = AuditAuditorWorkspaceView(
        user_id=user_id,
        name=name,
        filters=filters,
        is_default=is_default,
    )
    db.add(row)
    await db.flush()
    return row


async def list_workspace_views(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> list[AuditAuditorWorkspaceView]:
    return list(
        (
            await db.execute(
                select(AuditAuditorWorkspaceView)
                .where(AuditAuditorWorkspaceView.user_id == user_id)
                .order_by(AuditAuditorWorkspaceView.is_default.desc(), AuditAuditorWorkspaceView.name.asc())
            )
        ).scalars().all()
    )


def workspace_view_to_dict(row: AuditAuditorWorkspaceView) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "name": row.name,
        "filters": row.filters,
        "is_default": row.is_default,
    }
