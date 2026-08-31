"""Plantation operational reports API."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Query, Request, Response

from app.api.v1.deps import DB, CurrentUser
from app.services.audit import record_audit
from app.services.platform.governance import assert_org_feature_enabled
from app.services.reports.plantation_reports import (
    ExportFormat,
    build_fy_wise_report,
    build_project_wise_report,
    build_regeotag_report,
    build_total_records_report,
    export_fy_wise,
    export_project_wise,
    export_regeotag,
    export_total_records,
)

router = APIRouter(prefix="/plantation-reports", tags=["plantation-reports"])


def _file_response(data: bytes, media: str, filename: str) -> Response:
    return Response(
        content=data,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def _export_response(
    *,
    db,
    user,
    request: Request,
    report_kind: str,
    fmt: ExportFormat,
    ctx: dict,
    export_fn,
    filename_stem: str,
) -> Response | dict:
    if fmt == "json":
        return ctx
    data, media, ext = export_fn(ctx, fmt)
    await record_audit(
        db,
        actor=user,
        action=f"plantation_report.{report_kind}.export",
        resource_type="report",
        resource_id=None,
        request=request,
        diff={"format": fmt, "report": report_kind, "rows": ctx.get("total", 0)},
    )
    await db.commit()
    return _file_response(data, media, f"{filename_stem}.{ext}")


@router.get("/project-wise", response_model=None)
async def project_wise_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    financial_year: str | None = None,
    state_code: str | None = None,
    district_code: str | None = None,
    segment: str | None = None,
    scheme_code: str | None = None,
    status: str | None = Query(None, pattern="^(planning|active|completed|archived)$"),
    survival_due_only: bool = False,
    violations_only: bool = False,
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_project_wise_report(
        db,
        user,
        financial_year=financial_year or None,
        state_code=state_code or None,
        district_code=district_code or None,
        segment=segment or None,
        scheme_code=scheme_code or None,
        status=status,
        survival_due_only=survival_due_only,
        violations_only=violations_only,
    )
    return await _export_response(
        db=db,
        user=user,
        request=request,
        report_kind="project_wise",
        fmt=format,
        ctx=ctx,
        export_fn=export_project_wise,
        filename_stem="project-wise-plantation-report",
    )


@router.get("/fy-wise", response_model=None)
async def fy_wise_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    financial_year: str | None = None,
    state_code: str | None = None,
    segment: str | None = None,
    scheme_code: str | None = None,
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_fy_wise_report(
        db,
        user,
        financial_year=financial_year or None,
        state_code=state_code or None,
        segment=segment or None,
        scheme_code=scheme_code or None,
    )
    return await _export_response(
        db=db,
        user=user,
        request=request,
        report_kind="fy_wise",
        fmt=format,
        ctx=ctx,
        export_fn=export_fy_wise,
        filename_stem="fy-wise-plantation-report",
    )


@router.get("/re-geotag", response_model=None)
async def regeotag_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    project_id: uuid.UUID | None = None,
    financial_year: str | None = None,
    state_code: str | None = None,
    segment: str | None = None,
    min_days_overdue: int | None = Query(None, ge=0),
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_regeotag_report(
        db,
        user,
        project_id=project_id,
        financial_year=financial_year or None,
        state_code=state_code or None,
        segment=segment or None,
        min_days_overdue=min_days_overdue,
    )
    return await _export_response(
        db=db,
        user=user,
        request=request,
        report_kind="re_geotag",
        fmt=format,
        ctx=ctx,
        export_fn=export_regeotag,
        filename_stem="re-geotag-report",
    )


@router.get("/total-records", response_model=None)
async def total_records_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    project_id: uuid.UUID | None = None,
    work_area_id: uuid.UUID | None = None,
    financial_year: str | None = None,
    state_code: str | None = None,
    health: str | None = Query(None, pattern="^(good|fair|poor|unknown)$"),
    survival_status: str | None = Query(None, pattern="^(live|stressed|dead|replaced)$"),
    species: str | None = None,
    satellite_verified: bool | None = None,
    registered_from: datetime | None = None,
    registered_to: datetime | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=150),
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    export_all = format in ("pdf", "xlsx")
    ctx = await build_total_records_report(
        db,
        user,
        project_id=project_id,
        work_area_id=work_area_id,
        financial_year=financial_year or None,
        state_code=state_code or None,
        health=health,
        survival_status=survival_status,
        species=species or None,
        satellite_verified=satellite_verified,
        registered_from=registered_from,
        registered_to=registered_to,
        page=page,
        page_size=page_size,
        export_all=export_all,
    )
    if export_all and ctx.get("capped"):
        pass  # export first EXPORT_ROW_CAP rows; capped flag is informational only
    return await _export_response(
        db=db,
        user=user,
        request=request,
        report_kind="total_records",
        fmt=format,
        ctx=ctx,
        export_fn=export_total_records,
        filename_stem="total-plantation-records",
    )
