"""Carbon credit ledger API."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, ProgrammingError

from app.api.v1.deps import DB, CurrentUser, WriteAccess
from app.models.credit_ledger import CreditLedgerEvent, ProjectCreditLedger
from app.models.credit_serial import CreditSerial
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.schemas.credit_ledger import CreditLedgerSyncRequest, CreditLedgerTransition
from app.schemas.credit_registry import (
    CreditSerialRetireRequest,
    CreditTransferRequest,
    TreeClaimCreate,
)
from app.services.audit import record_audit
from app.services.credits.claims import claim_to_dict, register_tree_claim
from app.services.credits.green_credit import build_project_green_credit_summary
from app.services.credits.ledger import (
    ledger_to_dict,
    org_credit_summary,
    sync_project_ledger,
    transition_ledger_status,
)
from app.services.credits.serials import (
    render_retirement_certificate_pdf,
    retire_serial,
    serial_to_dict,
    transfer_serial_custody,
)
from app.services.planting_projects.access import can_manage_project, load_project

router = APIRouter(prefix="/credits", tags=["credits"])


def _raise_credit_ledger_db_error(exc: Exception) -> None:
    raw = str(getattr(exc, "orig", exc))
    if "project_credit_ledgers" in raw or "credit_ledger_events" in raw or "credit_serials" in raw:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="credit_ledger_migration_required",
        ) from exc
    if "null value" in raw.lower() and ("created_at" in raw or "updated_at" in raw):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="credit_ledger_migration_required",
        ) from exc


async def _ledger_with_events(db: DB, ledger: ProjectCreditLedger) -> dict:
    from app.services.carbon.risk_ops import latest_risk_assessment

    events = (
        await db.execute(
            select(CreditLedgerEvent)
            .where(CreditLedgerEvent.ledger_id == ledger.id)
            .order_by(CreditLedgerEvent.created_at.desc())
            .limit(20)
        )
    ).scalars().all()
    data = ledger_to_dict(ledger, list(events))
    risk = await latest_risk_assessment(db, ledger.project_id)
    if risk is not None:
        data["buffer_from_nprt"] = True
        data["nprt_score"] = float(risk.nprt_score)
    else:
        data["buffer_from_nprt"] = False

    from app.services.integrity.credit_gating import project_fusion_stats

    data["integrity_fusion"] = await project_fusion_stats(db, ledger.project_id)

    serials = (
        await db.execute(
            select(CreditSerial)
            .where(CreditSerial.project_id == ledger.project_id)
            .order_by(CreditSerial.created_at.desc())
        )
    ).scalars().all()
    data["serials"] = [serial_to_dict(s) for s in serials]
    return data


@router.get("/projects/{project_id}/green-credit")
async def get_project_green_credit_estimate(
    project_id: uuid.UUID, user: CurrentUser, db: DB
) -> dict:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    return await build_project_green_credit_summary(db, project)


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

    try:
        ledger = await sync_project_ledger(db, project)
        await db.commit()
        await db.refresh(ledger)
        return await _ledger_with_events(db, ledger)
    except (ProgrammingError, IntegrityError) as exc:
        await db.rollback()
        _raise_credit_ledger_db_error(exc)
        raise


@router.post("/projects/{project_id}/sync")
async def sync_project_credit_ledger(
    project_id: uuid.UUID,
    payload: CreditLedgerSyncRequest,
    request: Request,
    user: WriteAccess,
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
    user: WriteAccess,
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
            project=project,
        )
    except ValueError as exc:
        code = str(exc)
        if code.startswith("invalid_transition"):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=code) from exc
        if code == "registry_reference_required":
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=code) from exc
        if code.startswith("integrity_gate_failed"):
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": code, "message": "Project integrity fusion gate not met for this transition."},
            ) from exc
        if code.startswith("exclusive_claim_conflict"):
            raise HTTPException(status.HTTP_409_CONFLICT, detail=code) from exc
        raise
    except IntegrityError as exc:
        await db.rollback()
        raw = str(getattr(exc, "orig", exc))
        if "claim_registry_exclusive_active_idx" in raw:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="exclusive_claim_conflict") from exc
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


@router.post("/claims")
async def register_claim(
    payload: TreeClaimCreate,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> dict:
    tree = await db.get(Tree, payload.tree_id)
    if tree is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="tree_not_found")

    try:
        claim = await register_tree_claim(
            db,
            tree_id=payload.tree_id,
            scheme_code=payload.scheme_code,
            claim_type=payload.claim_type,
            exclusive=payload.exclusive,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="exclusive_claim_conflict") from exc

    await record_audit(
        db,
        actor=user,
        action="claim_registry.register",
        resource_type="claim_registry",
        resource_id=claim.id,
        request=request,
        diff={"tree_id": str(tree.id), "scheme_code": payload.scheme_code},
    )
    await db.commit()
    return claim_to_dict(claim, tree)


@router.post("/serials/{serial_id}/retire")
async def retire_credit_serial(
    serial_id: uuid.UUID,
    payload: CreditSerialRetireRequest,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> dict:
    serial = await db.get(CreditSerial, serial_id)
    if serial is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="serial_not_found")
    if (
        user.organization_id
        and serial.organization_id != user.organization_id
        and user.role != "admin"
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        serial = await retire_serial(
            db,
            serial,
            beneficiary=payload.beneficiary,
            retirement_reason=payload.retirement_reason,
            paris_article6=payload.paris_article6,
            corresponding_adjustment_ref=payload.corresponding_adjustment_ref,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="credit_serial.retire",
        resource_type="credit_serial",
        resource_id=serial.id,
        request=request,
        diff={"serial_number": serial.serial_number, "beneficiary": payload.beneficiary},
    )
    await db.commit()
    return serial_to_dict(serial)


@router.get("/serials/{serial_id}/certificate.pdf")
async def download_retirement_certificate(
    serial_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> Response:
    serial = await db.get(CreditSerial, serial_id)
    if serial is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="serial_not_found")
    if serial.status != "retired":
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="serial_not_retired")
    project = await db.get(PlantingProject, serial.project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    pdf = render_retirement_certificate_pdf(serial, project)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{serial.serial_number}-retirement.pdf"'
        },
    )


@router.post("/serials/{serial_id}/transfer")
async def transfer_credit_serial(
    serial_id: uuid.UUID,
    payload: CreditTransferRequest,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> dict:
    serial = await db.get(CreditSerial, serial_id)
    if serial is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="serial_not_found")
    if user.organization_id is None or serial.organization_id != user.organization_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        transfer = await transfer_serial_custody(
            db,
            serial,
            from_org_id=user.organization_id,
            to_org_id=payload.to_org_id,
            notes=payload.notes,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="credit_serial.transfer",
        resource_type="credit_serial",
        resource_id=serial.id,
        request=request,
        diff={"to_org_id": str(payload.to_org_id), "custody_hash": transfer.custody_hash},
    )
    await db.commit()
    return {
        "serial": serial_to_dict(serial),
        "transfer_id": str(transfer.id),
        "custody_hash": transfer.custody_hash,
    }
