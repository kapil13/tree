"""Mobile device registration and lightweight analytics."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.models.user_device import UserDevice

router = APIRouter(prefix="/devices", tags=["devices"])


class DeviceRegisterIn(BaseModel):
    push_token: str = Field(min_length=8, max_length=512)
    platform: str = Field(default="android", pattern="^(android|ios)$")
    device_label: str | None = Field(default=None, max_length=128)
    app_version: str | None = Field(default=None, max_length=32)


class DeviceRegisterOut(BaseModel):
    id: str
    registered: bool


@router.post("/register", response_model=DeviceRegisterOut)
async def register_device(payload: DeviceRegisterIn, user: CurrentUser, db: DB) -> DeviceRegisterOut:
    now = datetime.now(UTC)
    res = await db.execute(
        select(UserDevice).where(
            UserDevice.user_id == user.id,
            UserDevice.push_token == payload.push_token,
        )
    )
    device = res.scalar_one_or_none()
    if device is None:
        device = UserDevice(
            user_id=user.id,
            push_token=payload.push_token,
            platform=payload.platform,
            device_label=payload.device_label,
            app_version=payload.app_version,
            last_seen_at=now,
        )
        db.add(device)
    else:
        device.platform = payload.platform
        device.device_label = payload.device_label
        device.app_version = payload.app_version
        device.last_seen_at = now
    await db.commit()
    await db.refresh(device)
    return DeviceRegisterOut(id=str(device.id), registered=True)


@router.delete("/register", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_device(push_token: str, user: CurrentUser, db: DB) -> Response:
    res = await db.execute(
        select(UserDevice).where(
            UserDevice.user_id == user.id,
            UserDevice.push_token == push_token,
        )
    )
    device = res.scalar_one_or_none()
    if device is not None:
        await db.delete(device)
        await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


class AnalyticsEventIn(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    properties: dict = Field(default_factory=dict)


class AnalyticsBatchIn(BaseModel):
    events: list[AnalyticsEventIn] = Field(min_length=1, max_length=50)


@router.post("/analytics/events", status_code=status.HTTP_202_ACCEPTED)
async def ingest_analytics_events(
    payload: AnalyticsBatchIn, user: CurrentUser, db: DB
) -> dict[str, int]:
    """Accept mobile analytics events (stored in audit log for now)."""
    from app.services.audit import record_audit

    for event in payload.events:
        await record_audit(
            db,
            actor=user,
            action="mobile.analytics",
            resource_type="analytics_event",
            resource_id=None,
            diff={"name": event.name, "properties": event.properties},
        )
    await db.commit()
    return {"accepted": len(payload.events)}
