"""Carbon credit ledger API."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.models.credit_ledger import CreditLedgerEvent, ProjectCreditLedger
from app.schemas.credit_ledger import CreditLedgerSyncRequest, CreditLedgerTransition
from app.services.audit import record_audit
from app.services.credits.ledger import (
    ledger_to_dict,
    org_credit_summary,
    sync_project_ledger,
    transition_ledger_status,
)
from app.services.planting_projects.access import can_manage_project, load_project

router = APIRouter(prefix="/credits", tags=["credits"])


async def _ledger_with_events(db: DB, ledger: ProjectCreditLedger) -> dict:
    events = (
        await db.execute(
            select(CreditLedgerEvent)
            .where(CreditLedgerEvent.ledger_id == ledger.id)
            .order_by(CreditLedgerEvent.created_at.desc())
            .limit(20)
        )
    ).scalars().all()
    return ledger_to_dict(ledger, list(events))


@router.get("/summary")
async def credits_org_summary(user: CurrentUser, db: DB) -> dict:
    if user.organization_id is None:
        return {
            "project_count": 0,
            "by_status": {},
            "total_gross_credits_tco2e": 0,
            "total_buffer_withheld_tco2e": 0,
            "total_net_credits_tco2e": 0,
            "total_issued_credits_tco2e": 0,
        }
    return await org_credit_summary(db, user.organization_id)


@router.get("/projects/{project_id}")
async def get_project_credit_ledger(
    project_id: uuid.UUID, user: CurrentUser, db: DB
) -> dict:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    ledger = await sync_project_ledger(db, project)
    await db.commit()
    await db.refresh(ledger)
    return await _ledger_with_events(db, ledger)


@router.post("/projects/{project_id}/sync")
async def sync_project_credit_ledger(
    project_id: uuid.UUID,
    payload: CreditLedgerSyncRequest,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> dict:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    if not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    ledger = await sync_project_ledger(db, project, methodology=payload.methodology)
    await record_audit(
        db,
        actor=user,
        action="credit_ledger.sync",
        resource_type="credit_ledger",
        resource_id=ledger.id,
        request=request,
        diff={
            "project_id": str(project.id),
            "methodology": payload.methodology,
            "gross_credits_tco2e": float(ledger.gross_credits_tco2e),
            "status": ledger.status,
        },
    )
    await db.commit()
    await db.refresh(ledger)
    return await _ledger_with_events(db, ledger)


@router.post("/projects/{project_id}/transition")
async def transition_project_credit_ledger(
    project_id: uuid.UUID,
    payload: CreditLedgerTransition,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> dict:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    if not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    from app.services.credits.ledger import get_or_create_ledger

    ledger = await get_or_create_ledger(db, project)
    if ledger is None:
        ledger = await sync_project_ledger(db, project)

    try:
        await transition_ledger_status(
            db,
            ledger,
            to_status=payload.to_status,
            actor_user_id=user.id,
            notes=payload.notes,
            registry_reference=payload.registry_reference,
        )
    except ValueError as exc:
        code = str(exc)
        if code.startswith("invalid_transition"):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=code) from exc
        if code == "registry_reference_required":
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=code) from exc
        raise

    await record_audit(
        db,
        actor=user,
        action="credit_ledger.transition",
        resource_type="credit_ledger",
        resource_id=ledger.id,
        request=request,
        diff={
            "project_id": str(project.id),
            "to_status": payload.to_status,
            "registry_reference": payload.registry_reference,
        },
    )
    await db.commit()
    await db.refresh(ledger)
    return await _ledger_with_events(db, ledger)
