"""Public verification pages and link management."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser, require
from app.core.security import Permission
from app.models.public_verification import PublicVerificationLink
from app.models.tree import Tree
from app.schemas.public_verification import VerificationLinkCreate, VerificationLinkOut
from app.services.audit import record_audit
from app.services.planting_projects.access import can_manage_project, load_project
from app.services.public_verification.builder import (
    create_verification_link,
    public_verify_url,
    resolve_public_verification,
)

router = APIRouter(tags=["verification"])
public_router = APIRouter(prefix="/public", tags=["public"])


def _link_out(link: PublicVerificationLink) -> VerificationLinkOut:
    return VerificationLinkOut(
        id=link.id,
        token=link.token,
        resource_type=link.resource_type,
        resource_id=link.resource_id,
        label=link.label,
        public_url=public_verify_url(link.token),
        expires_at=link.expires_at,
        revoked_at=link.revoked_at,
        view_count=link.view_count,
        last_viewed_at=link.last_viewed_at,
        created_at=link.created_at,
    )


@public_router.get("/verify/{token}")
async def public_verify(token: str, db: DB) -> dict:
    """Read-only verification snapshot — no authentication required."""
    try:
        _link, payload = await resolve_public_verification(db, token)
        await db.commit()
        return payload
    except ValueError as exc:
        code = str(exc)
        if code in ("link_not_found", "resource_not_found"):
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=code) from exc
        if code in ("link_revoked", "link_expired"):
            raise HTTPException(status.HTTP_410_GONE, detail=code) from exc
        raise


@router.get(
    "/verification-links",
    response_model=list[VerificationLinkOut],
    dependencies=[require(Permission.AUDIT_READ)],
)
async def list_verification_links(
    user: CurrentUser,
    db: DB,
    project_id: uuid.UUID | None = None,
    resource_type: str | None = None,
) -> list[VerificationLinkOut]:
    stmt = select(PublicVerificationLink).order_by(PublicVerificationLink.created_at.desc())
    if user.role != "admin":
        if user.organization_id is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
        stmt = stmt.where(PublicVerificationLink.organization_id == user.organization_id)
    if project_id is not None:
        stmt = stmt.where(
            PublicVerificationLink.resource_type == "planting_project",
            PublicVerificationLink.resource_id == project_id,
        )
    if resource_type:
        stmt = stmt.where(PublicVerificationLink.resource_type == resource_type)

    rows = (await db.execute(stmt.limit(100))).scalars().all()
    return [_link_out(row) for row in rows]


@router.post(
    "/verification-links",
    response_model=VerificationLinkOut,
    dependencies=[require(Permission.AUDIT_READ)],
)
async def create_verification_link_endpoint(
    payload: VerificationLinkCreate,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> VerificationLinkOut:
    expires_at = None
    if payload.expires_in_days:
        expires_at = datetime.now(UTC) + timedelta(days=payload.expires_in_days)

    org_id = user.organization_id
    if payload.resource_type == "planting_project":
        project = await load_project(payload.resource_id, user, db)
        if project is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
        if not await can_manage_project(user, project, db):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
        org_id = project.organization_id
    elif payload.resource_type == "tree":
        tree = await db.get(Tree, payload.resource_id)
        if tree is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="tree_not_found")
        if user.role != "admin" and tree.organization_id != user.organization_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
        org_id = tree.organization_id
    else:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="unsupported_resource")

    link = await create_verification_link(
        db,
        resource_type=payload.resource_type,
        resource_id=payload.resource_id,
        organization_id=org_id,
        label=payload.label.strip(),
        created_by_user_id=user.id,
        expires_at=expires_at,
    )
    await record_audit(
        db,
        actor=user,
        action="verification_link.create",
        resource_type=payload.resource_type,
        resource_id=payload.resource_id,
        request=request,
        diff={
            "token_preview": link.token[:8],
            "label": link.label,
            "expires_at": expires_at.isoformat() if expires_at else None,
        },
    )
    await db.commit()
    await db.refresh(link)
    return _link_out(link)


@router.delete(
    "/verification-links/{link_id}",
    dependencies=[require(Permission.AUDIT_READ)],
)
async def revoke_verification_link(
    link_id: uuid.UUID,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> dict[str, str]:
    link = await db.get(PublicVerificationLink, link_id)
    if link is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="link_not_found")
    if user.role != "admin" and link.organization_id != user.organization_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    link.revoked_at = datetime.now(UTC)
    await record_audit(
        db,
        actor=user,
        action="verification_link.revoke",
        resource_type=link.resource_type,
        resource_id=link.resource_id,
        request=request,
        diff={"token_preview": link.token[:8]},
    )
    await db.commit()
    return {"status": "revoked"}
