"""Framework-mapped reporting endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from app.api.v1.deps import DB, CurrentUser
from app.models.organization import Organization
from app.services.audit import record_audit
from app.services.planting_projects.access import load_project
from app.services.platform.governance import assert_org_feature_enabled
from app.services.reports.etf_handoff import (
    build_org_inventory_handoff,
    render_etf_handoff_csv,
    render_etf_handoff_xlsx,
)
from app.services.reports.framework_context import build_framework_report_context
from app.services.reports.framework_exporter import (
    render_framework_report_pdf,
    render_framework_report_xlsx,
)
from app.services.reports.frameworks import list_framework_profiles
from app.services.reports.gbf_exports import build_gbf_context, render_gbf_xlsx
from app.services.reports.iso14064_org import (
    build_iso14064_org_context,
    render_iso14064_org_json,
    render_iso14064_org_xlsx,
    render_iso14064_org_zip,
)
from app.services.reports.sbti_flag import build_sbti_flag_context, render_sbti_flag_xlsx

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
    await assert_org_feature_enabled(db, user, "reports")
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


@router.get("/inventory-handoff")
async def export_inventory_handoff(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
) -> Response:
    """Org-level ETF / BTR national inventory handoff export."""
    await assert_org_feature_enabled(db, user, "reports")
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="organization_required")

    ctx = await build_org_inventory_handoff(db, user.organization_id)
    if format == "xlsx":
        data = render_etf_handoff_xlsx(ctx)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "xlsx"
    else:
        data = render_etf_handoff_csv(ctx)
        media = "text/csv"
        ext = "csv"

    await record_audit(
        db,
        actor=user,
        action="etf_handoff.export",
        resource_type="organization",
        resource_id=user.organization_id,
        request=request,
        diff={"format": format, "project_count": ctx["totals"]["project_count"]},
    )
    await db.commit()

    return Response(
        content=data,
        media_type=media,
        headers={
            "Content-Disposition": f'attachment; filename="etf-btr-inventory-handoff.{ext}"'
        },
    )


@router.get("/sbti-flag")
async def export_sbti_flag_worksheet(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: str = Query("xlsx", pattern="^(xlsx)$"),
) -> Response:
    """Org-level SBTi FLAG land-sector removals worksheet."""
    await assert_org_feature_enabled(db, user, "reports")
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="organization_required")

    ctx = await build_sbti_flag_context(db, user.organization_id)
    data = render_sbti_flag_xlsx(ctx)

    await record_audit(
        db,
        actor=user,
        action="sbti_flag.export",
        resource_type="organization",
        resource_id=user.organization_id,
        request=request,
        diff={"project_count": ctx["totals"]["project_count"]},
    )
    await db.commit()

    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="sbti-flag-worksheet.xlsx"'},
    )


@router.get("/iso14064-org")
async def export_iso14064_org_inventory(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: str = Query("xlsx", pattern="^(json|xlsx|zip)$"),
) -> Response:
    """Org-level ISO 14064-1 GHG inventory export."""
    await assert_org_feature_enabled(db, user, "reports")
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="organization_required")

    org = await db.get(Organization, user.organization_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")

    ctx = await build_iso14064_org_context(db, organization=org)
    slug = (org.slug or "org").replace("/", "-")

    if format == "json":
        data = render_iso14064_org_json(ctx)
        media = "application/json"
        filename = f"iso14064-org-{slug}.json"
    elif format == "zip":
        data = render_iso14064_org_zip(ctx)
        media = "application/zip"
        filename = f"iso14064-org-{slug}.zip"
    else:
        data = render_iso14064_org_xlsx(ctx)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"iso14064-org-{slug}.xlsx"

    await record_audit(
        db,
        actor=user,
        action="iso14064_org.export",
        resource_type="organization",
        resource_id=user.organization_id,
        request=request,
        diff={"format": format},
    )
    await db.commit()

    return Response(
        content=data,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/gbf-indicators")
async def export_gbf_indicators(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: str = Query("xlsx", pattern="^(xlsx)$"),
) -> Response:
    """Org-level Kunming-Montreal GBF indicator mapping."""
    await assert_org_feature_enabled(db, user, "reports")
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="organization_required")

    org = await db.get(Organization, user.organization_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organization_not_found")

    ctx = await build_gbf_context(db, organization=org)
    data = render_gbf_xlsx(ctx)

    await record_audit(
        db,
        actor=user,
        action="gbf_indicators.export",
        resource_type="organization",
        resource_id=user.organization_id,
        request=request,
        diff={"project_count": ctx["target_2_restore"]["portfolio_totals"]["project_count"]},
    )
    await db.commit()

    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="gbf-indicator-mapping.xlsx"'},
    )
