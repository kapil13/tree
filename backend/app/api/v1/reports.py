"""Report generation endpoints."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser, require_write_perm
from app.core.security import Permission
from app.models.organization import Organization
from app.models.report import Report
from app.models.user import User
from app.schemas.brsr import BrsrExportRequest
from app.services.audit import record_audit
from app.services.platform.governance import assert_org_feature_enabled
from app.services.reports.brsr import (
    build_brsr_context,
    render_brsr_json,
    render_brsr_xlsx,
    render_brsr_zip,
)
from app.services.reports.generator import build_and_store_report, generate_report_bytes
from app.services.storage import get_storage

router = APIRouter(prefix="/reports", tags=["reports"])

ReportGenerateAccess = Annotated[User, require_write_perm(Permission.REPORT_GENERATE)]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_report(
    kind: str,
    format: str,
    request: Request,
    user: ReportGenerateAccess,
    db: DB,
    plantation_fence_id: uuid.UUID | None = Query(None),
) -> dict:
    """Generate a report synchronously and mark it ready for download."""
    await assert_org_feature_enabled(db, user, "reports")
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


@router.post("/brsr")
async def export_brsr_report(
    payload: BrsrExportRequest,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> Response:
    """SEBI BRSR Core Principle 6 export — available to org viewers (auditor read-only)."""
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="org_member_required")
    await assert_org_feature_enabled(db, user, "reports")

    org = await db.get(Organization, user.organization_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")

    if payload.project_id is not None:
        from app.services.planting_projects.access import load_project

        project = await load_project(payload.project_id, user, db)
        if project is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    try:
        ctx = await build_brsr_context(db, organization=org, project_id=payload.project_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    slug = (org.slug or "org").replace("/", "-")
    if payload.format == "json":
        data = render_brsr_json(ctx)
        media = "application/json"
        filename = f"brsr-{slug}-p6.json"
    elif payload.format == "xlsx":
        data = render_brsr_xlsx(ctx)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"brsr-{slug}-p6.xlsx"
    else:
        data = render_brsr_zip(ctx)
        media = "application/zip"
        filename = f"brsr-{slug}-p6-pack.zip"

    await record_audit(
        db,
        actor=user,
        action="report.brsr.export",
        resource_type="organization",
        resource_id=org.id,
        request=request,
        diff={
            "format": payload.format,
            "project_id": str(payload.project_id) if payload.project_id else None,
            "org_role": user.org_role,
        },
    )
    await db.commit()

    return Response(
        content=data,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
