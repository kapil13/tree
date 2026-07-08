"""Alerts inbox and notification preferences."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.models.alert import Alert
from app.services.alerts.defaults import DEFAULT_SATELLITE_HEALTH_PREFS, default_notification_preferences
from app.services.alerts.service import satellite_health_prefs

router = APIRouter(prefix="/alerts", tags=["alerts"])


class SatelliteHealthNotificationPrefs(BaseModel):
    enabled: bool = True
    channels: list[str] = Field(default_factory=lambda: ["in_app", "email"])
    sms_on_critical: bool = True


class NotificationPreferencesOut(BaseModel):
    satellite_health: SatelliteHealthNotificationPrefs


class NotificationPreferencesUpdate(BaseModel):
    satellite_health: SatelliteHealthNotificationPrefs | None = None


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
            "payload": a.payload,
        }
        for a in rows
    ]


@router.get("/preferences", response_model=NotificationPreferencesOut)
async def get_preferences(user: CurrentUser) -> NotificationPreferencesOut:
    sh = satellite_health_prefs(user)
    return NotificationPreferencesOut(satellite_health=SatelliteHealthNotificationPrefs(**sh))


@router.patch("/preferences", response_model=NotificationPreferencesOut)
async def update_preferences(
    payload: NotificationPreferencesUpdate, user: CurrentUser, db: DB
) -> NotificationPreferencesOut:
    prefs: dict[str, Any] = dict(user.notification_preferences or default_notification_preferences())
    if payload.satellite_health is not None:
        current = prefs.get("satellite_health", dict(DEFAULT_SATELLITE_HEALTH_PREFS))
        current.update(payload.satellite_health.model_dump())
        prefs["satellite_health"] = current
    user.notification_preferences = prefs
    await db.commit()
    await db.refresh(user)
    sh = satellite_health_prefs(user)
    return NotificationPreferencesOut(satellite_health=SatelliteHealthNotificationPrefs(**sh))


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
