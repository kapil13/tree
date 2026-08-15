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
from app.schemas.iso14064 import Iso14064ExportRequest
from app.schemas.sprint11_reports import DarwinExportRequest, FrameworkExportRequest
from app.services.audit import record_audit
from app.services.biodiversity.darwin_core import (
    build_darwin_occurrences,
    render_darwin_json,
    render_darwin_zip,
)
from app.services.carbon.ghg_protocol import (
    build_ghg_protocol_context,
    render_ghg_protocol_json,
    render_ghg_protocol_xlsx,
    render_ghg_protocol_zip,
)
from app.services.platform.governance import assert_org_feature_enabled
from app.services.reports.brsr import (
    build_brsr_context,
    render_brsr_json,
    render_brsr_xlsx,
    render_brsr_zip,
)
from app.services.reports.generator import build_and_store_report, generate_report_bytes
from app.services.reports.iso14064 import (
    build_iso14064_context,
    render_iso14064_json,
    render_iso14064_xlsx,
    render_iso14064_zip,
)
from app.services.reports.tnfd import (
    build_tnfd_context,
    render_tnfd_json,
    render_tnfd_xlsx,
    render_tnfd_zip,
)
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


@router.post("/iso14064")
async def export_iso14064_report(
    payload: Iso14064ExportRequest,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> Response:
    """ISO 14064-2 project GHG quantification document — org members including viewers."""
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="org_member_required")
    await assert_org_feature_enabled(db, user, "reports")

    from app.services.planting_projects.access import load_project

    project = await load_project(payload.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    try:
        ctx = await build_iso14064_context(db, project=project)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    code = (project.code or "project").replace("/", "-")
    if payload.format == "json":
        data = render_iso14064_json(ctx)
        media = "application/json"
        filename = f"iso14064-{code}.json"
    elif payload.format == "xlsx":
        data = render_iso14064_xlsx(ctx)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"iso14064-{code}.xlsx"
    else:
        data = render_iso14064_zip(ctx)
        media = "application/zip"
        filename = f"iso14064-{code}-pack.zip"

    await record_audit(
        db,
        actor=user,
        action="report.iso14064.export",
        resource_type="planting_project",
        resource_id=project.id,
        request=request,
        diff={
            "format": payload.format,
            "project_id": str(project.id),
            "org_role": user.org_role,
        },
    )
    await db.commit()

    return Response(
        content=data,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/tnfd")
async def export_tnfd_report(
    payload: FrameworkExportRequest,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> Response:
    """TNFD LEAP nature disclosure — bioacoustic, IUCN, NDVI fusion."""
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="org_member_required")
    await assert_org_feature_enabled(db, user, "reports")
    org = await db.get(Organization, user.organization_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    if payload.project_id is not None:
        from app.services.planting_projects.access import load_project

        if await load_project(payload.project_id, user, db) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    ctx = await build_tnfd_context(db, organization=org, project_id=payload.project_id)
    slug = (org.slug or "org").replace("/", "-")
    if payload.format == "json":
        data, media, filename = render_tnfd_json(ctx), "application/json", f"tnfd-{slug}.json"
    elif payload.format == "xlsx":
        data = render_tnfd_xlsx(ctx)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"tnfd-{slug}.xlsx"
    else:
        data, media, filename = render_tnfd_zip(ctx), "application/zip", f"tnfd-{slug}-pack.zip"

    await record_audit(
        db,
        actor=user,
        action="report.tnfd.export",
        resource_type="organization",
        resource_id=org.id,
        request=request,
        diff={"format": payload.format, "project_id": str(payload.project_id) if payload.project_id else None},
    )
    await db.commit()
    return Response(
        content=data, media_type=media, headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/ghg-protocol")
async def export_ghg_protocol_report(
    payload: FrameworkExportRequest,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> Response:
    """GHG Protocol Land Sector (2024) removals inventory lines."""
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="org_member_required")
    await assert_org_feature_enabled(db, user, "reports")
    org = await db.get(Organization, user.organization_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")
    if payload.project_id is not None:
        from app.services.planting_projects.access import load_project

        if await load_project(payload.project_id, user, db) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    ctx = await build_ghg_protocol_context(db, organization=org, project_id=payload.project_id)
    slug = (org.slug or "org").replace("/", "-")
    if payload.format == "json":
        data, media, filename = render_ghg_protocol_json(ctx), "application/json", f"ghg-{slug}.json"
    elif payload.format == "xlsx":
        data = render_ghg_protocol_xlsx(ctx)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"ghg-{slug}.xlsx"
    else:
        data, media, filename = render_ghg_protocol_zip(ctx), "application/zip", f"ghg-{slug}-pack.zip"

    await record_audit(
        db,
        actor=user,
        action="report.ghg_protocol.export",
        resource_type="organization",
        resource_id=org.id,
        request=request,
        diff={"format": payload.format, "project_id": str(payload.project_id) if payload.project_id else None},
    )
    await db.commit()
    return Response(
        content=data, media_type=media, headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/darwin-core")
async def export_darwin_core(
    payload: DarwinExportRequest,
    request: Request,
    user: CurrentUser,
    db: DB,
) -> Response:
    """Darwin Core Archive (DwC-A) for GBIF species observation publish."""
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="org_member_required")
    await assert_org_feature_enabled(db, user, "reports")
    org = await db.get(Organization, user.organization_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")

    from app.services.planting_projects.access import load_project

    project = await load_project(payload.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    occurrences = await build_darwin_occurrences(
        db, project=project, organization_name=org.name or "BYOT"
    )
    code = (project.code or "project").replace("/", "-")
    if payload.format == "json":
        data = render_darwin_json(
            occurrences,
            {"project_code": project.code, "record_count": len(occurrences)},
        )
        media = "application/json"
        filename = f"darwin-{code}.json"
    else:
        data = render_darwin_zip(occurrences, project_code=project.code, org_name=org.name or "BYOT")
        media = "application/zip"
        filename = f"darwin-{code}-dwca.zip"

    await record_audit(
        db,
        actor=user,
        action="report.darwin_core.export",
        resource_type="planting_project",
        resource_id=project.id,
        request=request,
        diff={"format": payload.format, "record_count": len(occurrences)},
    )
    await db.commit()
    return Response(
        content=data, media_type=media, headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
