"""DPDP privacy endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import Response

from app.api.v1.deps import DB, CurrentUser, WriteAccess
from app.schemas.privacy import (
    ConsentGrantRequest,
    ConsentRecordOut,
    DataSubjectRequestCreate,
    DataSubjectRequestOut,
    DeleteAccountRequest,
    GrievanceCreate,
    GrievanceOut,
    PrivacySummaryOut,
)
from app.services.audit import record_audit
from app.services.privacy.consent import grant_consent, list_consents, withdraw_consent
from app.services.privacy.constants import (
    GRIEVANCE_OFFICER_EMAIL,
    GRIEVANCE_OFFICER_NAME,
    PRIVACY_POLICY_VERSION,
)
from app.services.privacy.erasure import queue_account_erasure
from app.services.privacy.export import build_user_data_export, export_as_json_bytes
from app.services.privacy.requests import (
    create_data_request,
    create_grievance,
    list_data_requests,
    list_grievances,
)

router = APIRouter(prefix="/privacy", tags=["privacy"])


def _client_meta(request: Request) -> tuple[str | None, str | None]:
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    return ip, ua


@router.get("/summary", response_model=PrivacySummaryOut)
async def privacy_summary(user: CurrentUser, db: DB) -> PrivacySummaryOut:
    return PrivacySummaryOut(
        policy_version=PRIVACY_POLICY_VERSION,
        consents=await list_consents(db, user.id),
        data_requests=await list_data_requests(db, user.id),
        grievances=await list_grievances(db, user.id),
    )


@router.get("/officer")
async def grievance_officer() -> dict:
    return {
        "name": GRIEVANCE_OFFICER_NAME,
        "email": GRIEVANCE_OFFICER_EMAIL,
        "policy_version": PRIVACY_POLICY_VERSION,
    }


@router.post("/consent", response_model=ConsentRecordOut, status_code=status.HTTP_201_CREATED)
async def record_consent(
    payload: ConsentGrantRequest, request: Request, user: WriteAccess, db: DB
) -> ConsentRecordOut:
    ip, ua = _client_meta(request)
    try:
        row = await grant_consent(
            db,
            user=user,
            purpose=payload.purpose,
            policy_version=payload.policy_version,
            ip=ip,
            user_agent=ua,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    await db.commit()
    return row


@router.delete("/consent/{purpose}", response_model=ConsentRecordOut)
async def withdraw_user_consent(
    purpose: str, user: WriteAccess, db: DB
) -> ConsentRecordOut:
    try:
        row = await withdraw_consent(db, user=user, purpose=purpose)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="consent_not_found")
    await db.commit()
    return row


@router.post("/data-requests", response_model=DataSubjectRequestOut, status_code=status.HTTP_201_CREATED)
async def submit_data_request(
    payload: DataSubjectRequestCreate, user: WriteAccess, db: DB
) -> DataSubjectRequestOut:
    row = await create_data_request(
        db,
        user=user,
        request_type=payload.request_type,
        notes=payload.notes,
    )
    await db.commit()
    return row


@router.get("/data-export")
async def download_data_export(user: CurrentUser, db: DB) -> Response:
    payload = await build_user_data_export(db, user)
    content = export_as_json_bytes(payload)
    return Response(
        content=content,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="byot-data-export-{user.id}.json"'
        },
    )


@router.post("/delete-account")
async def delete_account(
    payload: DeleteAccountRequest,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> dict:
    if payload.confirm_email.strip().lower() != user.email.strip().lower():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="email_mismatch")
    try:
        result = await queue_account_erasure(db, user=user, reason=payload.reason)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    await record_audit(
        db,
        actor=user,
        action="user.delete_account",
        resource_type="user",
        resource_id=user.id,
        request=request,
        diff={"status": "erased"},
    )
    await db.commit()
    return result


@router.post("/grievances", response_model=GrievanceOut, status_code=status.HTTP_201_CREATED)
async def file_grievance(
    payload: GrievanceCreate, user: WriteAccess, db: DB
) -> GrievanceOut:
    row = await create_grievance(
        db,
        user=user,
        subject=payload.subject,
        body=payload.body,
    )
    await db.commit()
    return row
