"""Report generation endpoints."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.models.report import Report
from app.services.audit import record_audit
from app.services.reports.generator import build_and_store_report, generate_report_bytes
from app.services.storage import get_storage

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_report(
    kind: str,
    format: str,
    request: Request,
    user: CurrentUser,
    db: DB,
    plantation_fence_id: uuid.UUID | None = Query(None),
) -> dict:
    """Generate a report synchronously and mark it ready for download."""
    if kind not in {"tree", "plantation", "carbon", "esg", "biodiversity"}:
        raise HTTPException(422, detail="invalid_kind")
    if format not in {"pdf", "xlsx"}:
        raise HTTPException(422, detail="invalid_format")
    if kind in {"biodiversity", "plantation"} and plantation_fence_id is None:
        raise HTTPException(422, detail="plantation_fence_id_required")

    filters: dict = {}
    if plantation_fence_id:
        filters["plantation_fence_id"] = str(plantation_fence_id)

    r = Report(
        organization_id=user.organization_id,
        requested_by=user.id,
        kind=kind,
        format=format,
        status="generating",
        filters=filters,
    )
    db.add(r)
    await db.flush()
    await record_audit(
        db,
        actor=user,
        action="report.create",
        resource_type="report",
        resource_id=r.id,
        request=request,
        diff={"kind": kind, "format": format, "filters": filters},
    )
    await build_and_store_report(r, user=user, db=db)
    await db.commit()
    await db.refresh(r)

    if r.status == "failed":
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=r.error or "report_generation_failed",
        )

    return {
        "id": str(r.id),
        "status": r.status,
        "kind": r.kind,
        "filters": r.filters,
        "download_ready": True,
    }


@router.get("")
async def list_reports(user: CurrentUser, db: DB) -> list[dict]:
    stmt = select(Report).where(Report.requested_by == user.id).order_by(
        Report.created_at.desc()
    )
    rows = (await db.execute(stmt.limit(50))).scalars().all()
    return [
        {
            "id": str(r.id),
            "kind": r.kind,
            "format": r.format,
            "status": r.status,
            "filters": r.filters,
            "s3_key": r.s3_key,
            "error": r.error,
            "created_at": r.created_at.isoformat(),
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in rows
    ]


@router.get("/{report_id}/download")
async def download_report(
    report_id: uuid.UUID, request: Request, user: CurrentUser, db: DB
) -> Response:
    res = await db.execute(
        select(Report).where(Report.id == report_id, Report.requested_by == user.id)
    )
    rpt = res.scalar_one_or_none()
    if rpt is None:
        raise HTTPException(404, detail="not_found")
    if rpt.status == "failed":
        raise HTTPException(400, detail=rpt.error or "report_generation_failed")

    storage = get_storage()
    data: bytes | None = None
    media_type = "application/pdf"
    ext = rpt.format if rpt.format in {"pdf", "xlsx"} else "pdf"

    if rpt.s3_key:
        data = storage.get_bytes(rpt.s3_key)
        if rpt.s3_key.endswith(".xlsx"):
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ext = "xlsx"

    if data is None:
        try:
            data, media_type, ext = await generate_report_bytes(rpt, user=user, db=db)
            if storage.is_available() and not rpt.s3_key:
                key = f"reports/{user.organization_id or user.id}/{rpt.id}.{ext}"
                storage.put_bytes(key, data, content_type=media_type)
                rpt.s3_key = key
            rpt.status = "ready"
            rpt.completed_at = datetime.now(UTC)
            rpt.error = None
        except ValueError as exc:
            raise HTTPException(400, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="report.download",
        resource_type="report",
        resource_id=rpt.id,
        request=request,
        diff={"kind": rpt.kind, "format": rpt.format},
    )
    await db.commit()

    return Response(
        content=data,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{rpt.kind}-{rpt.id}.{ext}"'
        },
    )
