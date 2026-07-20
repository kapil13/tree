"""Framework-mapped reporting endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from app.api.v1.deps import DB, CurrentUser
from app.services.audit import record_audit
from app.services.planting_projects.access import load_project
from app.services.reports.framework_context import build_framework_report_context
from app.services.reports.framework_exporter import (
    render_framework_report_pdf,
    render_framework_report_xlsx,
)
from app.services.reports.frameworks import list_framework_profiles

router = APIRouter(prefix="/reporting", tags=["reporting"])


@router.get("/frameworks")
async def get_framework_profiles() -> list[dict]:
    """List available compliance framework report profiles."""
    return list_framework_profiles()


@router.get("/projects/{project_id}/framework-report")
async def export_framework_report(
    project_id: uuid.UUID,
    request: Request,
    user: CurrentUser,
    db: DB,
    profile: str = Query(..., min_length=3, max_length=32),
    format: str = Query("pdf", pattern="^(pdf|xlsx)$"),
) -> Response:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    try:
        ctx = await build_framework_report_context(db, project, profile)
    except ValueError as exc:
        if str(exc) == "unknown_framework_profile":
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
        raise

    safe_code = project.code.replace("/", "-")
    profile_code = ctx["framework"]["code"]
    if format == "xlsx":
        data = render_framework_report_xlsx(ctx)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "xlsx"
    else:
        data = render_framework_report_pdf(ctx)
        media = "application/pdf"
        ext = "pdf"

    await record_audit(
        db,
        actor=user,
        action="framework_report.export",
        resource_type="planting_project",
        resource_id=project.id,
        request=request,
        diff={
            "profile": profile_code,
            "format": format,
            "project_code": project.code,
            "methodology": ctx["framework"].get("methodology"),
        },
    )
    await db.commit()

    return Response(
        content=data,
        media_type=media,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{safe_code}-{profile_code}-framework-report.{ext}"'
            )
        },
    )
