"""Alerts inbox."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.models.alert import Alert

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
async def list_alerts(user: CurrentUser, db: DB, unread_only: bool = False) -> list[dict]:
    stmt = select(Alert).where(Alert.user_id == user.id).order_by(Alert.created_at.desc())
    if unread_only:
        stmt = stmt.where(Alert.is_read.is_(False))
    rows = (await db.execute(stmt.limit(100))).scalars().all()
    return [
        {
            "id": str(a.id),
            "kind": a.kind,
            "severity": a.severity,
            "title": a.title,
            "message": a.message,
            "is_read": a.is_read,
            "created_at": a.created_at.isoformat(),
            "tree_id": str(a.tree_id) if a.tree_id else None,
        }
        for a in rows
    ]


@router.post("/{alert_id}/read")
async def mark_read(alert_id: uuid.UUID, user: CurrentUser, db: DB) -> dict:
    res = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == user.id)
    )
    a = res.scalar_one_or_none()
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    a.is_read = True
    await db.commit()
    return {"status": "ok"}
