"""Organization webhook management API."""

from __future__ import annotations

import secrets
import uuid

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser, require
from app.core.security import Permission
from app.models.webhook import OrganizationWebhook, WebhookDelivery
from app.schemas.webhook import (
    WebhookCreate,
    WebhookCreatedOut,
    WebhookDeliveryOut,
    WebhookOut,
    WebhookUpdate,
)
from app.services.audit import record_audit
from app.services.webhooks.dispatcher import deliver_test_webhook
from app.services.webhooks.events import WEBHOOK_EVENT_TYPES

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _secret_preview(secret: str) -> str:
    return f"whsec_…{secret[-4:]}" if len(secret) >= 4 else "whsec_…"


def _webhook_out(row: OrganizationWebhook) -> WebhookOut:
    return WebhookOut(
        id=row.id,
        label=row.label,
        url=row.url,
        events=list(row.events or []),
        enabled=row.enabled,
        signing_secret_preview=_secret_preview(row.signing_secret),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _require_org(user: CurrentUser) -> uuid.UUID:
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="organization_required")
    return user.organization_id


@router.get("/events")
async def list_webhook_events() -> list[str]:
    return list(WEBHOOK_EVENT_TYPES)


@router.get("", response_model=list[WebhookOut], dependencies=[require(Permission.AUDIT_READ)])
async def list_webhooks(user: CurrentUser, db: DB) -> list[WebhookOut]:
    org_id = _require_org(user)
    rows = (
        await db.execute(
            select(OrganizationWebhook)
            .where(OrganizationWebhook.organization_id == org_id)
            .order_by(OrganizationWebhook.created_at.desc())
        )
    ).scalars().all()
    return [_webhook_out(row) for row in rows]


@router.post("", response_model=WebhookCreatedOut, dependencies=[require(Permission.AUDIT_READ)])
async def create_webhook(
    payload: WebhookCreate,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> WebhookCreatedOut:
    org_id = _require_org(user)
    invalid = [e for e in payload.events if e not in WEBHOOK_EVENT_TYPES]
    if invalid:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"invalid_events:{','.join(invalid)}",
        )

    secret = secrets.token_urlsafe(32)
    row = OrganizationWebhook(
        organization_id=org_id,
        label=payload.label.strip(),
        url=str(payload.url),
        signing_secret=secret,
        events=payload.events,
        enabled=True,
        created_by_user_id=user.id,
    )
    db.add(row)
    await db.flush()
    await record_audit(
        db,
        actor=user,
        action="webhook.create",
        resource_type="webhook",
        resource_id=row.id,
        request=request,
        diff={"label": row.label, "events": row.events},
    )
    await db.commit()
    await db.refresh(row)
    base = _webhook_out(row)
    return WebhookCreatedOut(**base.model_dump(), signing_secret=secret)


@router.patch("/{webhook_id}", response_model=WebhookOut, dependencies=[require(Permission.AUDIT_READ)])
async def update_webhook(
    webhook_id: uuid.UUID,
    payload: WebhookUpdate,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> WebhookOut:
    org_id = _require_org(user)
    row = await db.get(OrganizationWebhook, webhook_id)
    if row is None or row.organization_id != org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="webhook_not_found")

    if payload.label is not None:
        row.label = payload.label.strip()
    if payload.url is not None:
        row.url = str(payload.url)
    if payload.events is not None:
        invalid = [e for e in payload.events if e not in WEBHOOK_EVENT_TYPES]
        if invalid:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"invalid_events:{','.join(invalid)}",
            )
        row.events = payload.events
    if payload.enabled is not None:
        row.enabled = payload.enabled

    await record_audit(
        db,
        actor=user,
        action="webhook.update",
        resource_type="webhook",
        resource_id=row.id,
        request=request,
        diff={"enabled": row.enabled, "events": row.events},
    )
    await db.commit()
    await db.refresh(row)
    return _webhook_out(row)


@router.delete("/{webhook_id}", dependencies=[require(Permission.AUDIT_READ)])
async def delete_webhook(
    webhook_id: uuid.UUID,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> dict[str, str]:
    org_id = _require_org(user)
    row = await db.get(OrganizationWebhook, webhook_id)
    if row is None or row.organization_id != org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="webhook_not_found")

    await record_audit(
        db,
        actor=user,
        action="webhook.delete",
        resource_type="webhook",
        resource_id=row.id,
        request=request,
        diff={"label": row.label},
    )
    await db.delete(row)
    await db.commit()
    return {"status": "deleted"}


@router.post("/{webhook_id}/rotate-secret", response_model=WebhookCreatedOut, dependencies=[require(Permission.AUDIT_READ)])
async def rotate_webhook_secret(
    webhook_id: uuid.UUID,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> WebhookCreatedOut:
    org_id = _require_org(user)
    row = await db.get(OrganizationWebhook, webhook_id)
    if row is None or row.organization_id != org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="webhook_not_found")

    secret = secrets.token_urlsafe(32)
    row.signing_secret = secret
    await record_audit(
        db,
        actor=user,
        action="webhook.rotate_secret",
        resource_type="webhook",
        resource_id=row.id,
        request=request,
    )
    await db.commit()
    await db.refresh(row)
    base = _webhook_out(row)
    return WebhookCreatedOut(**base.model_dump(), signing_secret=secret)


@router.post("/{webhook_id}/test", response_model=WebhookDeliveryOut, dependencies=[require(Permission.AUDIT_READ)])
async def test_webhook(
    webhook_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> WebhookDeliveryOut:
    org_id = _require_org(user)
    row = await db.get(OrganizationWebhook, webhook_id)
    if row is None or row.organization_id != org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="webhook_not_found")

    delivery = await deliver_test_webhook(db, row, actor_user_id=user.id)
    await db.commit()
    return WebhookDeliveryOut(
        id=delivery.id,
        webhook_id=delivery.webhook_id,
        event_type=delivery.event_type,
        status=delivery.status,
        attempt_count=delivery.attempt_count,
        response_status=delivery.response_status,
        error_message=delivery.error_message,
        delivered_at=delivery.delivered_at,
        created_at=delivery.created_at,
        payload=delivery.payload,
    )


@router.get("/deliveries", response_model=list[WebhookDeliveryOut], dependencies=[require(Permission.AUDIT_READ)])
async def list_webhook_deliveries(
    user: CurrentUser,
    db: DB,
    limit: int = 50,
) -> list[WebhookDeliveryOut]:
    org_id = _require_org(user)
    rows = (
        await db.execute(
            select(WebhookDelivery)
            .join(OrganizationWebhook, WebhookDelivery.webhook_id == OrganizationWebhook.id)
            .where(OrganizationWebhook.organization_id == org_id)
            .order_by(WebhookDelivery.created_at.desc())
            .limit(min(limit, 100))
        )
    ).scalars().all()
    return [
        WebhookDeliveryOut(
            id=row.id,
            webhook_id=row.webhook_id,
            event_type=row.event_type,
            status=row.status,
            attempt_count=row.attempt_count,
            response_status=row.response_status,
            error_message=row.error_message,
            delivered_at=row.delivered_at,
            created_at=row.created_at,
            payload=row.payload,
        )
        for row in rows
    ]
