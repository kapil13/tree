"""Plantation operational reports API."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Query, Request, Response

from app.api.v1.deps import DB, CurrentUser
from app.schemas.district_rollup import DistrictRollupOut
from app.services.audit import record_audit
from app.services.platform.governance import assert_org_feature_enabled
from app.services.reports.district_rollup import build_district_rollup
from app.services.reports.plantation_extended_reports import (
    build_carbon_stock_report,
    build_compliance_violations_report,
    build_district_block_admin_report,
    build_field_team_performance_report,
    build_out_of_fence_report,
    build_pending_registration_report,
    build_photo_evidence_report,
    build_satellite_health_report,
    build_scheme_kpi_report,
    build_species_wise_report,
    build_survival_mortality_report,
    build_work_area_site_report,
    export_carbon_stock,
    export_compliance_violations,
    export_district_block_admin,
    export_field_team_performance,
    export_out_of_fence,
    export_pending_registration,
    export_photo_evidence,
    export_satellite_health,
    export_scheme_kpi,
    export_species_wise,
    export_survival_mortality,
    export_work_area_site,
)
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


@router.get("/species-wise", response_model=None)
async def species_wise_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    project_id: uuid.UUID | None = None,
    financial_year: str | None = None,
    state_code: str | None = None,
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_species_wise_report(
        db, user, project_id=project_id, financial_year=financial_year, state_code=state_code
    )
    return await _export_response(
        db=db, user=user, request=request, report_kind="species_wise", fmt=format,
        ctx=ctx, export_fn=export_species_wise, filename_stem="species-wise-report",
    )


@router.get("/work-area-site", response_model=None)
async def work_area_site_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    project_id: uuid.UUID | None = None,
    financial_year: str | None = None,
    state_code: str | None = None,
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_work_area_site_report(
        db, user, project_id=project_id, financial_year=financial_year, state_code=state_code
    )
    return await _export_response(
        db=db, user=user, request=request, report_kind="work_area_site", fmt=format,
        ctx=ctx, export_fn=export_work_area_site, filename_stem="work-area-site-report",
    )


@router.get("/survival-mortality", response_model=None)
async def survival_mortality_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    project_id: uuid.UUID | None = None,
    financial_year: str | None = None,
    scheme_code: str | None = None,
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_survival_mortality_report(
        db, user, project_id=project_id, financial_year=financial_year, scheme_code=scheme_code
    )
    return await _export_response(
        db=db, user=user, request=request, report_kind="survival_mortality", fmt=format,
        ctx=ctx, export_fn=export_survival_mortality, filename_stem="survival-mortality-report",
    )


@router.get("/compliance-violations", response_model=None)
async def compliance_violations_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    project_id: uuid.UUID | None = None,
    resolved: bool | None = None,
    severity: str | None = Query(None, pattern="^(info|warn|block)$"),
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_compliance_violations_report(
        db, user, project_id=project_id, resolved=resolved, severity=severity
    )
    return await _export_response(
        db=db, user=user, request=request, report_kind="compliance_violations", fmt=format,
        ctx=ctx, export_fn=export_compliance_violations, filename_stem="compliance-violations-report",
    )


@router.get("/satellite-health", response_model=None)
async def satellite_health_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    project_id: uuid.UUID | None = None,
    financial_year: str | None = None,
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_satellite_health_report(
        db, user, project_id=project_id, financial_year=financial_year
    )
    return await _export_response(
        db=db, user=user, request=request, report_kind="satellite_health", fmt=format,
        ctx=ctx, export_fn=export_satellite_health, filename_stem="satellite-health-report",
    )


@router.get("/scheme-kpi", response_model=None)
async def scheme_kpi_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    scheme_code: str | None = None,
    financial_year: str | None = None,
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_scheme_kpi_report(db, user, scheme_code=scheme_code, financial_year=financial_year)
    return await _export_response(
        db=db, user=user, request=request, report_kind="scheme_kpi", fmt=format,
        ctx=ctx, export_fn=export_scheme_kpi, filename_stem="scheme-kpi-report",
    )


@router.get("/field-team-performance", response_model=None)
async def field_team_performance_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    project_id: uuid.UUID | None = None,
    financial_year: str | None = None,
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_field_team_performance_report(
        db, user, project_id=project_id, financial_year=financial_year
    )
    return await _export_response(
        db=db, user=user, request=request, report_kind="field_team_performance", fmt=format,
        ctx=ctx, export_fn=export_field_team_performance, filename_stem="field-team-performance-report",
    )


@router.get("/carbon-stock", response_model=None)
async def carbon_stock_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    financial_year: str | None = None,
    state_code: str | None = None,
    group_by: str = Query("project", pattern="^(project|fy)$"),
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_carbon_stock_report(
        db, user, financial_year=financial_year, state_code=state_code, group_by=group_by
    )
    return await _export_response(
        db=db, user=user, request=request, report_kind="carbon_stock", fmt=format,
        ctx=ctx, export_fn=export_carbon_stock, filename_stem="carbon-stock-report",
    )


@router.get("/photo-evidence", response_model=None)
async def photo_evidence_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    project_id: uuid.UUID | None = None,
    financial_year: str | None = None,
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_photo_evidence_report(
        db, user, project_id=project_id, financial_year=financial_year
    )
    return await _export_response(
        db=db, user=user, request=request, report_kind="photo_evidence", fmt=format,
        ctx=ctx, export_fn=export_photo_evidence, filename_stem="photo-evidence-pack",
    )


@router.get("/district-rollup", response_model=DistrictRollupOut)
async def district_rollup_report(
    user: CurrentUser,
    db: DB,
    state_code: str | None = None,
    district_code: str | None = None,
    financial_year: str | None = None,
    scheme_code: str | None = None,
    group_by: str = Query("district", pattern="^(district|block)$"),
) -> dict:
    await assert_org_feature_enabled(db, user, "reports")
    return await build_district_rollup(
        db,
        user,
        state_code=state_code,
        district_code=district_code,
        financial_year=financial_year,
        scheme_code=scheme_code,
        group_by=group_by,  # type: ignore[arg-type]
    )


@router.get("/district-block-admin", response_model=None)
async def district_block_admin_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    state_code: str | None = None,
    district_code: str | None = None,
    financial_year: str | None = None,
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_district_block_admin_report(
        db, user, state_code=state_code, district_code=district_code, financial_year=financial_year
    )
    return await _export_response(
        db=db, user=user, request=request, report_kind="district_block_admin", fmt=format,
        ctx=ctx, export_fn=export_district_block_admin, filename_stem="district-block-admin-report",
    )


@router.get("/pending-registration", response_model=None)
async def pending_registration_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    financial_year: str | None = None,
    state_code: str | None = None,
    min_gap: int = Query(1, ge=1),
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_pending_registration_report(
        db, user, financial_year=financial_year, state_code=state_code, min_gap=min_gap
    )
    return await _export_response(
        db=db, user=user, request=request, report_kind="pending_registration", fmt=format,
        ctx=ctx, export_fn=export_pending_registration, filename_stem="pending-registration-report",
    )


@router.get("/out-of-fence", response_model=None)
async def out_of_fence_report(
    request: Request,
    user: CurrentUser,
    db: DB,
    format: ExportFormat = Query("json", alias="format"),
    project_id: uuid.UUID | None = None,
) -> Response | dict:
    await assert_org_feature_enabled(db, user, "reports")
    ctx = await build_out_of_fence_report(db, user, project_id=project_id)
    return await _export_response(
        db=db, user=user, request=request, report_kind="out_of_fence", fmt=format,
        ctx=ctx, export_fn=export_out_of_fence, filename_stem="out-of-fence-trees-report",
    )
