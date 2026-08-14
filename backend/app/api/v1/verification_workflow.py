"""Verifier sample workflow API."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import Response
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser, WriteAccess
from app.core.security import Permission, Role, has_permission
from app.models.tree import Tree
from app.models.verification_workflow import VerificationItem, VerificationSample
from app.schemas.verification_workflow import (
    VerificationAttestRequest,
    VerificationItemOut,
    VerificationSampleCreate,
)
from app.services.audit import record_audit
from app.services.planting_projects.access import can_manage_project, load_project
from app.services.verification.samples import (
    attest_verification_item,
    create_verification_sample,
    render_sample_audit_pdf,
    sample_summary,
)

router = APIRouter(prefix="/verification", tags=["verification"])


async def _require_supervisor_or_admin(user: CurrentUser) -> None:
    if has_permission(user.role, Permission.ADMIN_ALL):
        return
    if user.role in {Role.FIELD_SUPERVISOR.value, Role.GOVERNMENT.value, Role.NGO.value}:
        return
    raise HTTPException(status.HTTP_403_FORBIDDEN, detail="supervisor_required")


async def _require_verifier(user: CurrentUser) -> None:
    if has_permission(user.role, Permission.ADMIN_ALL):
        return
    if has_permission(user.role, Permission.MEASUREMENT_ATTEST):
        return
    raise HTTPException(status.HTTP_403_FORBIDDEN, detail="verifier_required")


@router.post("/projects/{project_id}/samples")
async def create_project_verification_sample(
    project_id: uuid.UUID,
    payload: VerificationSampleCreate,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> dict:
    await _require_supervisor_or_admin(user)
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    if not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        sample = await create_verification_sample(
            db,
            project_id=project.id,
            organization_id=project.organization_id,
            sample_pct=payload.sample_pct,
            method=payload.method,
            created_by=user.id,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="verification_sample.create",
        resource_type="verification_sample",
        resource_id=sample.id,
        request=request,
        diff={"project_id": str(project.id), "sample_pct": payload.sample_pct},
    )
    await db.commit()
    return await sample_summary(db, sample)


@router.get("/samples/{sample_id}")
async def get_verification_sample(
    sample_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> dict:
    sample = await db.get(VerificationSample, sample_id)
    if sample is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="sample_not_found")
    project = await load_project(sample.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    summary = await sample_summary(db, sample)
    items = (
        await db.execute(select(VerificationItem).where(VerificationItem.sample_id == sample.id))
    ).scalars().all()
    tree_ids = [item.tree_id for item in items]
    trees: dict[uuid.UUID, Tree] = {}
    if tree_ids:
        tree_rows = (await db.execute(select(Tree).where(Tree.id.in_(tree_ids)))).scalars().all()
        trees = {t.id: t for t in tree_rows}

    summary["items"] = [
        VerificationItemOut(
            id=item.id,
            tree_id=item.tree_id,
            tree_public_code=trees[item.tree_id].public_code if item.tree_id in trees else None,
            status=item.status,
            verifier_id=item.verifier_id,
            signed_at=item.signed_at.isoformat() if item.signed_at else None,
            notes=item.notes,
            attestation_hash=item.attestation_hash,
        ).model_dump()
        for item in items
    ]
    return summary


@router.post("/samples/{sample_id}/items/{item_id}/attest")
async def attest_sample_item(
    sample_id: uuid.UUID,
    item_id: uuid.UUID,
    payload: VerificationAttestRequest,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> dict:
    await _require_verifier(user)
    sample = await db.get(VerificationSample, sample_id)
    if sample is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="sample_not_found")
    item = (
        await db.execute(
            select(VerificationItem).where(
                VerificationItem.id == item_id,
                VerificationItem.sample_id == sample_id,
            )
        )
    ).scalar_one_or_none()
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="item_not_found")

    tree = await db.get(Tree, item.tree_id)
    if tree is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="tree_not_found")

    try:
        updated = await attest_verification_item(
            db,
            item,
            tree,
            verifier_id=user.id,
            status=payload.status,
            notes=payload.notes,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="verification_item.attest",
        resource_type="verification_item",
        resource_id=updated.id,
        request=request,
        diff={"status": payload.status, "tree_id": str(tree.id)},
    )
    await db.commit()
    return {
        "id": str(updated.id),
        "status": updated.status,
        "attestation_hash": updated.attestation_hash,
        "signed_at": updated.signed_at.isoformat() if updated.signed_at else None,
    }


@router.get("/samples/{sample_id}/report.pdf")
async def export_sample_audit_report(
    sample_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> Response:
    sample = await db.get(VerificationSample, sample_id)
    if sample is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="sample_not_found")
    project = await load_project(sample.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    items = list(
        (await db.execute(select(VerificationItem).where(VerificationItem.sample_id == sample.id)))
        .scalars()
        .all()
    )
    tree_ids = [item.tree_id for item in items]
    trees = {}
    if tree_ids:
        tree_rows = (await db.execute(select(Tree).where(Tree.id.in_(tree_ids)))).scalars().all()
        trees = {t.id: t for t in tree_rows}

    pdf = render_sample_audit_pdf(sample, items, trees)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="verification-sample-{sample_id}.pdf"'},
    )
