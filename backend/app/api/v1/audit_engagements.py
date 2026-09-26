"""Estate Watch audit intake API (Phase 1)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, File, HTTPException, Request, Response, UploadFile, status

from app.api.v1.deps import DB, CurrentUser, PlatformAdmin, WriteAccess
from app.schemas.audit_attestation import (
    AnomalyReviewCreate,
    AnomalyReviewOut,
    AnomalyReviewQueueOut,
    AttestationCosignCreate,
    AttestationOut,
    AttestationSignCreate,
    AttestationSummaryOut,
)
from app.schemas.audit_confidence import ConfidenceComputeOut, ConfidenceMapOut
from app.schemas.audit_cycle import (
    AuditCycleCreate,
    AuditCycleTransition,
    ReauditCycleCreate,
)
from app.schemas.audit_cycle import (
    AuditCycleOut as KernelAuditCycleOut,
)
from app.schemas.audit_engagement import (
    AuditEngagementDetailOut,
    AuditEngagementOut,
    BoundaryVersionCreate,
    BoundaryVersionOut,
    ClaimDocumentCreate,
    ClaimDocumentOut,
    ClaimSnapshotOut,
    GisValidationRunOut,
    IntakeGateOut,
    KmlImportResult,
    PlantabilityExclusionCreate,
    PlantabilityExclusionOut,
    PlausibilityAssessmentOut,
    WorkingClaimUpdate,
)
from app.schemas.audit_explain import AuditExplainOut, AuditReconciliationExplainIn
from app.schemas.audit_export import (
    AuditExportCreateOut,
    AuditExportDetailOut,
    AuditExportListItemOut,
    AuditExportVerificationOut,
    AuditMethodologyBindingOut,
    AuditMethodologyBindingUpdate,
    AuditMethodologyBundleOut,
    AuditMethodologyChangeLogOut,
    AuditMethodologyOut,
    ExportReadinessOut,
    ExportSummaryOut,
    ReconciliationOut,
)
from app.schemas.audit_integrity_bridge import AuditIntegrityBridgeOut
from app.schemas.audit_portfolio import (
    AuditAuditorWorkspaceOut,
    AuditBenchmarksOut,
    AuditCrossEstatePatternsOut,
    AuditCrossOrgSummaryOut,
    AuditDigestRunOut,
    AuditDigestScheduleCreate,
    AuditDigestScheduleOut,
    AuditFieldPlotQueueOut,
    AuditPortfolioRollupsOut,
    AuditPortfolioSummaryOut,
    AuditReportTemplateOut,
    AuditWorkspaceViewCreate,
    AuditWorkspaceViewOut,
)
from app.schemas.audit_reaudit import AuditCycleSummaryOut, ReauditStartCreate, ReauditStartOut
from app.schemas.audit_risk import AnomaliesSummaryOut, AuditorQueueOut, RiskScanOut
from app.schemas.audit_sampling import (
    EvidenceGraphOut,
    FieldVerificationCompleteOut,
    FieldVisitCreate,
    FieldVisitOut,
    ReconciliationRunOut,
    SamplingPlanGenerateOut,
    SamplingPlanParams,
    SamplingPlanPreviewOut,
    SamplingPlanSummaryOut,
)
from app.schemas.audit_satellite import (
    AuditBaselineOut,
    PromoteBoundariesOut,
    SatelliteTimelineOut,
)
from app.services.audit import record_audit
from app.services.audit_intake.claim_snapshot import freeze_claim_snapshot, update_working_claim
from app.services.audit_intake.ops import (
    complete_intake,
    create_boundary,
    create_claim_document,
    create_exclusion,
    engagement_detail,
    engagement_summary,
    get_engagement_by_project,
    get_or_create_engagement,
    import_kml,
    run_gis_validation,
    run_plausibility,
)
from app.services.planting_projects.access import can_manage_project, load_project
from app.services.schemes.monitoring import is_monitoring_scheme
from app.services.storage.key_ownership import assert_owned_upload_key

router = APIRouter(prefix="/audit-engagements", tags=["audit-engagements"])


async def _require_monitoring_project(project) -> None:
    if not is_monitoring_scheme(project.scheme_code):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="audit_intake_requires_estate_monitoring_scheme",
        )


async def _load_engagement_for_project(
    db, project_id: uuid.UUID, user: CurrentUser
):
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    await _require_monitoring_project(project)
    engagement = await get_engagement_by_project(db, project.id)
    if engagement is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    return project, engagement


def _serialize_summary(raw: dict) -> AuditEngagementOut:
    snap = raw.get("latest_snapshot")
    return AuditEngagementOut(
        id=raw["id"],
        project_id=raw["project_id"],
        status=raw["status"],
        intake_completed_at=raw.get("intake_completed_at"),
        working_claim=raw.get("working_claim") or {},
        latest_snapshot=ClaimSnapshotOut.model_validate(snap) if snap else None,
        boundary_count=raw.get("boundary_count", 0),
        document_count=raw.get("document_count", 0),
        exclusion_count=raw.get("exclusion_count", 0),
        created_at=raw["created_at"],
        updated_at=raw["updated_at"],
    )


def _serialize_detail(raw: dict) -> AuditEngagementDetailOut:
    base = _serialize_summary(raw)
    gis = raw.get("latest_gis_validation")
    gate = raw.get("intake_gate")
    return AuditEngagementDetailOut(
        **base.model_dump(),
        boundaries=[BoundaryVersionOut.model_validate(b) for b in raw.get("boundaries", [])],
        documents=[ClaimDocumentOut.model_validate(d) for d in raw.get("documents", [])],
        exclusions=[PlantabilityExclusionOut.model_validate(e) for e in raw.get("exclusions", [])],
        plausibility=[
            PlausibilityAssessmentOut.model_validate(p) for p in raw.get("plausibility", [])
        ],
        claim_snapshots=[
            ClaimSnapshotOut.model_validate(s) for s in raw.get("claim_snapshots", [])
        ],
        latest_gis_validation=GisValidationRunOut.model_validate(gis) if gis else None,
        intake_gate=IntakeGateOut.model_validate(gate) if gate else None,
    )


async def _load_managed_engagement(db, engagement_id: uuid.UUID, user):
    from app.models.audit_engagement import AuditEngagement

    engagement = await db.get(AuditEngagement, engagement_id)
    if engagement is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(engagement.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    return engagement


@router.get("/portfolio-summary", response_model=AuditPortfolioSummaryOut)
async def get_audit_portfolio_summary(user: CurrentUser, db: DB) -> AuditPortfolioSummaryOut:
    from app.services.audit_portfolio.portfolio_summary import build_audit_portfolio_summary

    summary = await build_audit_portfolio_summary(db, user)
    return AuditPortfolioSummaryOut.model_validate(summary)


@router.get("/cross-org-summary", response_model=AuditCrossOrgSummaryOut)
async def get_cross_org_audit_summary(
    user: PlatformAdmin,
    db: DB,
) -> AuditCrossOrgSummaryOut:
    from app.services.audit_portfolio.cross_org_summary import build_cross_org_audit_summary

    summary = await build_cross_org_audit_summary(db, user)
    return AuditCrossOrgSummaryOut.model_validate(summary)


@router.get("/field-plot-queue", response_model=AuditFieldPlotQueueOut)
async def get_audit_field_plot_queue(
    user: CurrentUser,
    db: DB,
    project_id: uuid.UUID | None = None,
    limit: int = 50,
) -> AuditFieldPlotQueueOut:
    from app.services.audit_portfolio.field_plot_queue import build_audit_field_plot_queue

    summary = await build_audit_field_plot_queue(
        db, user, project_id=project_id, limit=min(limit, 100), active_plan_only=True
    )
    return AuditFieldPlotQueueOut.model_validate(summary)


def _require_org_id(user) -> uuid.UUID:
    if user.organization_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="organization_required")
    return user.organization_id


@router.post("/portfolio-rollups/compute", response_model=AuditPortfolioRollupsOut)
async def compute_portfolio_rollups(user: CurrentUser, db: DB) -> AuditPortfolioRollupsOut:
    from app.services.audit_portfolio.rollups import (
        compute_org_portfolio_rollups,
        org_rollup_aggregate,
    )

    org_id = _require_org_id(user)
    await compute_org_portfolio_rollups(db, organization_id=org_id)
    await db.commit()
    aggregate = await org_rollup_aggregate(db, organization_id=org_id)
    return AuditPortfolioRollupsOut.model_validate(aggregate)


@router.get("/portfolio-rollups", response_model=AuditPortfolioRollupsOut)
async def get_portfolio_rollups(user: CurrentUser, db: DB) -> AuditPortfolioRollupsOut:
    from app.services.audit_portfolio.rollups import org_rollup_aggregate

    org_id = _require_org_id(user)
    aggregate = await org_rollup_aggregate(db, organization_id=org_id)
    return AuditPortfolioRollupsOut.model_validate(aggregate)


@router.post("/benchmarks/compute", response_model=AuditBenchmarksOut)
async def compute_benchmarks(user: CurrentUser, db: DB) -> AuditBenchmarksOut:
    from app.services.audit_portfolio.benchmarks import (
        benchmark_to_dict,
        compute_benchmark_baselines,
    )

    org_id = _require_org_id(user)
    rows = await compute_benchmark_baselines(db, organization_id=org_id, scope="org")
    await db.commit()
    return AuditBenchmarksOut(baselines=[benchmark_to_dict(r) for r in rows])


@router.get("/benchmarks", response_model=AuditBenchmarksOut)
async def get_benchmarks(user: CurrentUser, db: DB) -> AuditBenchmarksOut:
    from app.services.audit_portfolio.benchmarks import benchmark_to_dict, list_benchmark_baselines

    org_id = _require_org_id(user)
    rows = await list_benchmark_baselines(db, organization_id=org_id, scope="org")
    return AuditBenchmarksOut(baselines=[benchmark_to_dict(r) for r in rows])


@router.post("/cross-estate-patterns/detect", response_model=AuditCrossEstatePatternsOut)
async def detect_cross_estate_patterns_route(
    user: CurrentUser, db: DB
) -> AuditCrossEstatePatternsOut:
    from app.services.audit_portfolio.anomaly_patterns import (
        detect_cross_estate_patterns,
        pattern_to_dict,
    )

    org_id = _require_org_id(user)
    rows = await detect_cross_estate_patterns(db, organization_id=org_id)
    await db.commit()
    return AuditCrossEstatePatternsOut(patterns=[pattern_to_dict(r) for r in rows])


@router.get("/cross-estate-patterns", response_model=AuditCrossEstatePatternsOut)
async def get_cross_estate_patterns(user: CurrentUser, db: DB) -> AuditCrossEstatePatternsOut:
    from app.services.audit_portfolio.anomaly_patterns import (
        list_cross_estate_patterns,
        pattern_to_dict,
    )

    org_id = _require_org_id(user)
    rows = await list_cross_estate_patterns(db, organization_id=org_id)
    return AuditCrossEstatePatternsOut(patterns=[pattern_to_dict(r) for r in rows])


@router.get("/report-templates", response_model=list[AuditReportTemplateOut])
async def get_report_templates(user: CurrentUser, db: DB) -> list[AuditReportTemplateOut]:
    from app.services.audit_portfolio.digest import list_report_templates, template_to_dict

    rows = await list_report_templates(db)
    return [AuditReportTemplateOut.model_validate(template_to_dict(r)) for r in rows]


@router.post("/digest-schedules", response_model=AuditDigestScheduleOut)
async def create_digest_schedule(
    body: AuditDigestScheduleCreate,
    user: CurrentUser,
    db: DB,
) -> AuditDigestScheduleOut:
    from app.services.audit_portfolio.digest import schedule_to_dict, upsert_digest_schedule

    org_id = _require_org_id(user)
    try:
        row = await upsert_digest_schedule(
            db,
            organization_id=org_id,
            template_code=body.template_code,
            cadence=body.cadence,
            enabled=body.enabled,
        )
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_found") from None
    await db.commit()
    return AuditDigestScheduleOut.model_validate(schedule_to_dict(row))


@router.get("/digest-schedules", response_model=list[AuditDigestScheduleOut])
async def list_digest_schedules_route(user: CurrentUser, db: DB) -> list[AuditDigestScheduleOut]:
    from app.services.audit_portfolio.digest import list_digest_schedules, schedule_to_dict

    org_id = _require_org_id(user)
    rows = await list_digest_schedules(db, organization_id=org_id)
    return [AuditDigestScheduleOut.model_validate(schedule_to_dict(r)) for r in rows]


@router.post("/digest-schedules/{schedule_id}/run", response_model=AuditDigestRunOut)
async def run_digest_schedule(
    schedule_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AuditDigestRunOut:
    from app.models.audit_portfolio_ops import AuditDigestSchedule
    from app.services.audit_portfolio.digest import digest_run_to_dict, generate_digest_run

    org_id = _require_org_id(user)
    schedule = await db.get(AuditDigestSchedule, schedule_id)
    if schedule is None or schedule.organization_id != org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="schedule_not_found")
    try:
        run = await generate_digest_run(
            db,
            user,
            organization_id=org_id,
            template_code=schedule.template_code,
            schedule_id=schedule.id,
        )
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="template_not_found") from None
    await db.commit()
    return AuditDigestRunOut.model_validate(digest_run_to_dict(run))


@router.get("/digest-runs", response_model=list[AuditDigestRunOut])
async def list_digest_runs_route(user: CurrentUser, db: DB) -> list[AuditDigestRunOut]:
    from app.services.audit_portfolio.digest import digest_run_to_dict, list_digest_runs

    org_id = _require_org_id(user)
    rows = await list_digest_runs(db, organization_id=org_id)
    return [AuditDigestRunOut.model_validate(digest_run_to_dict(r)) for r in rows]


@router.get("/auditor-workspace", response_model=AuditAuditorWorkspaceOut)
async def get_auditor_workspace(
    user: CurrentUser,
    db: DB,
    project_id: uuid.UUID | None = None,
    risk_level: str | None = None,
    engagement_status: str | None = None,
    limit: int = 100,
) -> AuditAuditorWorkspaceOut:
    from app.services.audit_portfolio.workspace import build_auditor_workspace

    summary = await build_auditor_workspace(
        db,
        user,
        project_id=project_id,
        risk_level=risk_level,
        engagement_status=engagement_status,
        limit=min(limit, 200),
    )
    return AuditAuditorWorkspaceOut.model_validate(summary)


@router.post("/auditor-workspace/views", response_model=AuditWorkspaceViewOut)
async def save_auditor_workspace_view(
    body: AuditWorkspaceViewCreate,
    user: CurrentUser,
    db: DB,
) -> AuditWorkspaceViewOut:
    from app.services.audit_portfolio.workspace import save_workspace_view, workspace_view_to_dict

    row = await save_workspace_view(
        db,
        user_id=user.id,
        name=body.name,
        filters=body.filters,
        is_default=body.is_default,
    )
    await db.commit()
    return AuditWorkspaceViewOut.model_validate(workspace_view_to_dict(row))


@router.get("/auditor-workspace/views", response_model=list[AuditWorkspaceViewOut])
async def list_auditor_workspace_views(user: CurrentUser, db: DB) -> list[AuditWorkspaceViewOut]:
    from app.services.audit_portfolio.workspace import list_workspace_views, workspace_view_to_dict

    rows = await list_workspace_views(db, user_id=user.id)
    return [AuditWorkspaceViewOut.model_validate(workspace_view_to_dict(r)) for r in rows]


@router.get("/projects/{project_id}", response_model=AuditEngagementDetailOut)
async def get_project_audit_engagement(
    project_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AuditEngagementDetailOut:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    await _require_monitoring_project(project)
    engagement = await get_engagement_by_project(db, project.id)
    if engagement is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    raw = await engagement_detail(db, engagement, project)
    return _serialize_detail(raw)


@router.post("/projects/{project_id}", response_model=AuditEngagementDetailOut)
async def create_project_audit_engagement(
    project_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> AuditEngagementDetailOut:
    project = await load_project(project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    if not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    await _require_monitoring_project(project)

    existing = await get_engagement_by_project(db, project.id)
    if existing:
        raw = await engagement_detail(db, existing, project)
        return _serialize_detail(raw)

    engagement = await get_or_create_engagement(db, project, created_by_user_id=user.id)
    await record_audit(
        db,
        actor=user,
        action="audit_engagement.create",
        resource_type="planting_project",
        resource_id=project.id,
        request=request,
        diff={"engagement_id": str(engagement.id)},
    )
    await db.commit()
    raw = await engagement_detail(db, engagement, project)
    return _serialize_detail(raw)


@router.get("/{engagement_id}", response_model=AuditEngagementDetailOut)
async def get_audit_engagement(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AuditEngagementDetailOut:
    from app.models.audit_engagement import AuditEngagement

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    raw = await engagement_detail(db, row, project)
    return _serialize_detail(raw)


@router.put("/{engagement_id}/claim", response_model=AuditEngagementOut)
async def update_claim(
    engagement_id: uuid.UUID,
    payload: WorkingClaimUpdate,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> AuditEngagementOut:
    from app.models.audit_engagement import AuditEngagement

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    if row.status != "draft":
        raise HTTPException(status.HTTP_409_CONFLICT, detail="engagement_not_editable")

    await update_working_claim(db, row, payload.claim.model_dump(exclude_none=True))
    await record_audit(
        db,
        actor=user,
        action="audit_engagement.claim.update",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
    )
    await db.commit()
    raw = await engagement_summary(db, row)
    return _serialize_summary(raw)


@router.post("/{engagement_id}/claim/freeze", response_model=ClaimSnapshotOut)
async def freeze_claim(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> ClaimSnapshotOut:
    from app.models.audit_engagement import AuditEngagement

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        snapshot = await freeze_claim_snapshot(db, row, created_by_user_id=user.id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.claim.freeze",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={"version": snapshot.version, "content_hash": snapshot.content_hash},
    )
    await db.commit()
    return ClaimSnapshotOut.model_validate(snapshot)


@router.post("/{engagement_id}/documents", response_model=ClaimDocumentOut)
async def upload_claim_document(
    engagement_id: uuid.UUID,
    payload: ClaimDocumentCreate,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> ClaimDocumentOut:
    from app.models.audit_engagement import AuditEngagement

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    try:
        assert_owned_upload_key(user.id, payload.s3_key, folders=("images", "safeguards", "audit"))
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    try:
        doc = await create_claim_document(
            db,
            row,
            doc_type=payload.doc_type,
            title=payload.title,
            s3_key=payload.s3_key,
            uploaded_by_user_id=user.id,
            metadata=payload.metadata,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.document.upload",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={"doc_type": payload.doc_type},
    )
    await db.commit()
    return ClaimDocumentOut(
        id=doc.id,
        doc_type=doc.doc_type,
        title=doc.title,
        s3_key=doc.s3_key,
        metadata=doc.doc_metadata or {},
        uploaded_by_user_id=doc.uploaded_by_user_id,
        created_at=doc.created_at,
    )


@router.post("/{engagement_id}/boundaries", response_model=BoundaryVersionOut)
async def add_boundary(
    engagement_id: uuid.UUID,
    payload: BoundaryVersionCreate,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> BoundaryVersionOut:
    from app.models.audit_engagement import AuditEngagement

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        bv = await create_boundary(
            db,
            row,
            name=payload.name,
            boundary_geojson=payload.boundary.model_dump(),
            block_type=payload.block_type,
            area_ha_claimed=payload.area_ha_claimed,
            source=payload.source,
            fence_id=payload.link_fence_id,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.boundary.create",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={"name": payload.name},
    )
    await db.commit()
    from app.services.audit_intake.ops import _boundary_out

    return BoundaryVersionOut.model_validate(_boundary_out(bv))


@router.post("/{engagement_id}/boundaries/import-kml", response_model=KmlImportResult)
async def import_kml_boundaries(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
    file: UploadFile = File(...),
) -> KmlImportResult:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_intake.ops import _boundary_out

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    data = await file.read()
    try:
        created = await import_kml(db, row, filename=file.filename or "upload.kml", data=data)
        result = KmlImportResult(
            imported=len(created),
            boundaries=[BoundaryVersionOut.model_validate(_boundary_out(b)) for b in created],
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.boundary.import_kml",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={"imported": len(created)},
    )
    await db.commit()
    return result


@router.post("/{engagement_id}/exclusions", response_model=PlantabilityExclusionOut)
async def add_exclusion(
    engagement_id: uuid.UUID,
    payload: PlantabilityExclusionCreate,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> PlantabilityExclusionOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_intake.ops import _exclusion_out

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        ex = await create_exclusion(
            db,
            row,
            exclusion_type=payload.exclusion_type,
            name=payload.name,
            boundary_geojson=payload.boundary.model_dump(),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.exclusion.create",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
    )
    await db.commit()
    return PlantabilityExclusionOut.model_validate(_exclusion_out(ex))


@router.post("/{engagement_id}/gis-validation", response_model=GisValidationRunOut)
async def run_gis_validation_endpoint(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> GisValidationRunOut:
    from app.models.audit_engagement import AuditEngagement

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    run = await run_gis_validation(db, row)
    await record_audit(
        db,
        actor=user,
        action="audit_engagement.gis_validation.run",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={"status": run.status},
    )
    await db.commit()
    return GisValidationRunOut.model_validate(run)


@router.post("/{engagement_id}/plausibility", response_model=list[PlausibilityAssessmentOut])
async def run_plausibility_endpoint(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> list[PlausibilityAssessmentOut]:
    from app.models.audit_engagement import AuditEngagement

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    from sqlalchemy import select

    from app.models.audit_engagement import BoundaryVersion

    assessments = await run_plausibility(db, row, project)
    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == row.id)
        )
    ).scalars().all()
    boundary_names = {b.id: b.name for b in boundaries}
    await record_audit(
        db,
        actor=user,
        action="audit_engagement.plausibility.run",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={"count": len(assessments)},
    )
    await db.commit()
    return [
        PlausibilityAssessmentOut(
            id=a.id,
            boundary_version_id=a.boundary_version_id,
            boundary_name=boundary_names.get(a.boundary_version_id),
            verdict=a.verdict,
            epistemic_label=a.epistemic_label,
            summary=a.summary,
            signals=a.signals or {},
            assessed_at=a.assessed_at,
        )
        for a in assessments
    ]


@router.post("/{engagement_id}/intake-complete", response_model=AuditEngagementDetailOut)
async def intake_complete(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> AuditEngagementDetailOut:
    from app.models.audit_engagement import AuditEngagement

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        raw = await complete_intake(db, row, project)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.intake.complete",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
    )
    await db.commit()
    return _serialize_detail(raw)


@router.post("/{engagement_id}/promote-boundaries", response_model=PromoteBoundariesOut)
async def promote_boundaries(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> PromoteBoundariesOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_satellite.promote import promote_boundaries_to_work_areas

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    if row.status not in {"intake_complete", "analysis_ready"}:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="intake_not_complete")

    try:
        promoted = await promote_boundaries_to_work_areas(
            db,
            row,
            project,
            owner_user_id=user.id,
            organization_id=user.organization_id,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.boundaries.promote",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={"count": len(promoted)},
    )
    await db.commit()
    return PromoteBoundariesOut(promoted=promoted, count=len(promoted))


@router.post("/{engagement_id}/baseline/t0", response_model=list[AuditBaselineOut])
async def establish_t0_baseline(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> list[AuditBaselineOut]:
    from sqlalchemy import select

    from app.models.audit_engagement import AuditEngagement, BoundaryVersion
    from app.services.audit_satellite.baseline import establish_t0_baselines

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        baselines = await establish_t0_baselines(db, row, project)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == row.id)
        )
    ).scalars().all()
    name_map = {b.id: b.name for b in boundaries}

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.baseline.t0",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={"count": len(baselines)},
    )
    await db.commit()
    return [
        AuditBaselineOut(
            id=bl.id,
            boundary_version_id=bl.boundary_version_id,
            boundary_name=name_map.get(bl.boundary_version_id),
            fence_id=bl.fence_id,
            planting_date=bl.planting_date.isoformat() if bl.planting_date else None,
            t0_scene_acquired_at=bl.t0_scene_acquired_at,
            t0_scene_id=bl.t0_scene_id,
            t0_provider=bl.t0_provider,
            t0_ndvi_mean=float(bl.t0_ndvi_mean) if bl.t0_ndvi_mean is not None else None,
            t0_evi_mean=float(bl.t0_evi_mean) if bl.t0_evi_mean is not None else None,
            backfill_status=bl.backfill_status,
            epistemic_label=bl.epistemic_label,
        )
        for bl in baselines
    ]


@router.post("/{engagement_id}/temporal-analysis")
async def run_temporal_analysis(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
    months: int = 60,
) -> dict[str, int]:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_satellite.timeline import build_temporal_timeline

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        obs = await build_temporal_timeline(db, row, project, months=months)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.temporal.analysis",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={"observations": len(obs)},
    )
    await db.commit()
    return {"observations": len(obs)}


@router.get("/{engagement_id}/satellite-timeline", response_model=SatelliteTimelineOut)
async def get_satellite_timeline(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> SatelliteTimelineOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_satellite.timeline import satellite_timeline_summary

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    summary = await satellite_timeline_summary(db, row.id)
    return SatelliteTimelineOut.model_validate(summary)


@router.post("/{engagement_id}/analysis-ready", response_model=AuditEngagementDetailOut)
async def mark_engagement_analysis_ready(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> AuditEngagementDetailOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_satellite.timeline import mark_analysis_ready

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        await mark_analysis_ready(db, row)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.analysis.ready",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
    )
    await db.commit()
    await db.refresh(row)
    raw = await engagement_detail(db, row, project)
    return _serialize_detail(raw)


@router.post("/{engagement_id}/confidence-map/compute", response_model=ConfidenceComputeOut)
async def compute_confidence_map(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
    include_field_signals: bool = False,
) -> ConfidenceComputeOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_confidence.compute import compute_confidence_map

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        assessments = await compute_confidence_map(
            db, row, include_field_signals=include_field_signals
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    grade_counts: dict[str, int] = {}
    for a in assessments:
        grade_counts[a.confidence_grade] = grade_counts.get(a.confidence_grade, 0) + 1

    await record_audit(
        db,
        actor=user,
        action=(
            "audit_engagement.confidence.refresh_field"
            if include_field_signals
            else "audit_engagement.confidence.compute"
        ),
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={
            "computed": len(assessments),
            "grade_counts": grade_counts,
            "include_field_signals": include_field_signals,
        },
    )
    await db.commit()
    return ConfidenceComputeOut(computed=len(assessments), grade_counts=grade_counts)


@router.get("/{engagement_id}/confidence-map", response_model=ConfidenceMapOut)
async def get_confidence_map(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> ConfidenceMapOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_confidence.compute import confidence_map_summary

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    summary = await confidence_map_summary(db, row.id)
    return ConfidenceMapOut.model_validate(summary)


@router.get(
    "/{engagement_id}/confidence-vs-field-reconciliation",
    response_model=ReconciliationOut,
)
async def get_confidence_field_reconciliation(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> ReconciliationOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_export.reconciliation import build_confidence_field_reconciliation

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    summary = await build_confidence_field_reconciliation(db, row.id)
    return ReconciliationOut.model_validate(summary)


@router.post("/{engagement_id}/risk-scan", response_model=RiskScanOut)
async def run_engagement_risk_scan(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> RiskScanOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_risk.scan import run_risk_scan

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        result = await run_risk_scan(db, row, project)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.risk.scan",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff=result,
    )
    await db.commit()
    return RiskScanOut.model_validate(result)


@router.get("/{engagement_id}/risk-anomalies", response_model=AnomaliesSummaryOut)
async def get_risk_anomalies(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AnomaliesSummaryOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_risk.queue import anomalies_summary

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    summary = await anomalies_summary(db, row.id)
    return AnomaliesSummaryOut.model_validate(summary)


@router.get("/{engagement_id}/auditor-queue", response_model=AuditorQueueOut)
async def get_auditor_queue(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AuditorQueueOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_risk.queue import auditor_queue_summary

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    summary = await auditor_queue_summary(db, row.id)
    return AuditorQueueOut.model_validate(summary)


@router.post("/{engagement_id}/sampling-plan/preview", response_model=SamplingPlanPreviewOut)
async def preview_engagement_sampling_plan(
    engagement_id: uuid.UUID,
    body: SamplingPlanParams,
    user: CurrentUser,
    db: DB,
) -> SamplingPlanPreviewOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_sampling.plan import preview_sampling_plan

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    try:
        preview = await preview_sampling_plan(
            db,
            row,
            sampling_mode=body.sampling_mode,
            plots_per_critical=body.plots_per_critical,
            plots_per_high=body.plots_per_high,
            plots_per_medium=body.plots_per_medium,
            plots_per_low=body.plots_per_low,
            ha_per_plot=body.ha_per_plot,
            min_plots_per_block=body.min_plots_per_block,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    return SamplingPlanPreviewOut.model_validate(preview)


@router.post("/{engagement_id}/sampling-plan/generate", response_model=SamplingPlanGenerateOut)
async def generate_engagement_sampling_plan(
    engagement_id: uuid.UUID,
    body: SamplingPlanParams,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> SamplingPlanGenerateOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_sampling.plan import generate_sampling_plan

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        plan = await generate_sampling_plan(
            db,
            row,
            sampling_mode=body.sampling_mode,
            plots_per_critical=body.plots_per_critical,
            plots_per_high=body.plots_per_high,
            plots_per_medium=body.plots_per_medium,
            plots_per_low=body.plots_per_low,
            ha_per_plot=body.ha_per_plot,
            min_plots_per_block=body.min_plots_per_block,
            layout_seed=body.layout_seed,
            created_by=user.id,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.sampling.generate",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={"total_plots": plan.total_plots},
    )
    await db.commit()
    return SamplingPlanGenerateOut(
        total_plots=plan.total_plots,
        status=plan.status,
        stratification=plan.stratification,
        plan_version=plan.plan_version,
    )


@router.post(
    "/{engagement_id}/reconciliation/compute",
    response_model=ReconciliationRunOut,
)
async def compute_engagement_reconciliation(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> ReconciliationRunOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_governance.engagement import require_mutable_cycle
    from app.services.audit_reconciliation.persist import persist_reconciliation_run

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    cycle = await require_mutable_cycle(db, row)
    try:
        run = await persist_reconciliation_run(db, row, cycle, created_by=user.id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.reconciliation.compute",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={"run_id": str(run.id), "mismatch_count": run.mismatch_count},
    )
    await db.commit()
    return ReconciliationRunOut(
        id=str(run.id),
        cycle_id=str(run.cycle_id),
        engagement_id=str(run.engagement_id),
        aligned_count=run.aligned_count,
        mismatch_count=run.mismatch_count,
        no_field_data_count=run.no_field_data_count,
        block_count=run.block_count,
        computed_at=run.computed_at,
    )


@router.post("/{engagement_id}/anomalies/{anomaly_id}/explain", response_model=AuditExplainOut)
async def explain_audit_anomaly(
    engagement_id: uuid.UUID,
    anomaly_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AuditExplainOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_explain.service import (
        explain_anomaly_for_engagement,
        explain_run_to_dict,
    )
    from app.services.audit_governance.access import require_audit_engagement_read

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        await require_audit_engagement_read(user, project, db)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    try:
        run = await explain_anomaly_for_engagement(
            db, engagement=row, anomaly_id=anomaly_id, created_by_user_id=user.id
        )
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="anomaly_not_found") from None
    await db.commit()
    return AuditExplainOut.model_validate(explain_run_to_dict(run))


@router.post("/{engagement_id}/reconciliation/explain", response_model=AuditExplainOut)
async def explain_audit_reconciliation(
    engagement_id: uuid.UUID,
    body: AuditReconciliationExplainIn,
    user: CurrentUser,
    db: DB,
) -> AuditExplainOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_explain.service import (
        explain_reconciliation_for_engagement,
        explain_run_to_dict,
    )
    from app.services.audit_governance.access import require_audit_engagement_read

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        await require_audit_engagement_read(user, project, db)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    boundary_id = uuid.UUID(body.boundary_version_id) if body.boundary_version_id else None
    try:
        run = await explain_reconciliation_for_engagement(
            db,
            engagement=row,
            boundary_version_id=boundary_id,
            created_by_user_id=user.id,
        )
    except ValueError as exc:
        detail = str(exc)
        if detail == "reconciliation_block_not_found":
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=detail) from exc
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="reconciliation_not_found") from exc
    await db.commit()
    return AuditExplainOut.model_validate(explain_run_to_dict(run))


@router.post("/{engagement_id}/evidence-graph/explain", response_model=AuditExplainOut)
async def explain_audit_evidence_graph(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AuditExplainOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_explain.service import (
        explain_evidence_graph_for_engagement,
        explain_run_to_dict,
    )
    from app.services.audit_governance.access import require_audit_engagement_read

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        await require_audit_engagement_read(user, project, db)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    try:
        run = await explain_evidence_graph_for_engagement(
            db, engagement=row, created_by_user_id=user.id
        )
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="audit_cycle_not_found") from None
    await db.commit()
    return AuditExplainOut.model_validate(explain_run_to_dict(run))


@router.post("/cross-estate-patterns/{pattern_id}/explain", response_model=AuditExplainOut)
async def explain_cross_estate_pattern(
    pattern_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AuditExplainOut:
    from app.services.audit_explain.service import (
        explain_cross_estate_pattern_for_org,
        explain_run_to_dict,
    )

    org_id = _require_org_id(user)
    try:
        run = await explain_cross_estate_pattern_for_org(
            db,
            organization_id=org_id,
            pattern_id=pattern_id,
            created_by_user_id=user.id,
        )
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="pattern_not_found") from None
    await db.commit()
    return AuditExplainOut.model_validate(explain_run_to_dict(run))


@router.get("/{engagement_id}/explain-runs", response_model=list[AuditExplainOut])
async def list_engagement_explain_runs(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
    limit: int = 20,
) -> list[AuditExplainOut]:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_explain.service import (
        explain_run_to_dict,
        list_explain_runs_for_engagement,
    )
    from app.services.audit_governance.access import require_audit_engagement_read

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        await require_audit_engagement_read(user, project, db)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    runs = await list_explain_runs_for_engagement(db, engagement_id=row.id, limit=min(limit, 50))
    return [AuditExplainOut.model_validate(explain_run_to_dict(r)) for r in runs]


@router.get("/{engagement_id}/evidence-graph", response_model=EvidenceGraphOut)
async def get_engagement_evidence_graph(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> EvidenceGraphOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_cycles.scope import resolve_read_cycle_id
    from app.services.audit_evidence.graph import evidence_graph_summary, sync_cycle_evidence_graph

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    cycle_id = await resolve_read_cycle_id(db, row.id)
    if cycle_id is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="audit_cycle_not_found")

    await sync_cycle_evidence_graph(db, row, cycle_id)
    await db.flush()
    summary = await evidence_graph_summary(db, cycle_id)
    return EvidenceGraphOut.model_validate(summary)


@router.get("/{engagement_id}/sampling-plan", response_model=SamplingPlanSummaryOut)
async def get_engagement_sampling_plan(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> SamplingPlanSummaryOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_sampling.summary import sampling_plan_summary

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    summary = await sampling_plan_summary(db, row.id)
    return SamplingPlanSummaryOut.model_validate(summary)


@router.post(
    "/{engagement_id}/field-plots/{plot_id}/visits",
    response_model=FieldVisitOut,
)
async def record_engagement_field_visit(
    engagement_id: uuid.UUID,
    plot_id: uuid.UUID,
    body: FieldVisitCreate,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> FieldVisitOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_sampling.visits import record_field_visit

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    for key in body.photo_keys:
        try:
            assert_owned_upload_key(user.id, key, folders=("images", "audit"))
        except ValueError as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    try:
        visit = await record_field_visit(
            db,
            engagement=row,
            plot_id=plot_id,
            visitor_id=user.id,
            tree_presence=body.tree_presence,
            photo_keys=body.photo_keys,
            visitor_lat=body.visitor_lat,
            visitor_lon=body.visitor_lon,
            trees_observed=body.trees_observed,
            trees_alive=body.trees_alive,
            canopy_cover_pct=body.canopy_cover_pct,
            verification_outcome=body.verification_outcome,
            notes=body.notes,
            signals=body.signals,
            idempotency_key=body.idempotency_key,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.field.visit",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={
            "plot_id": str(plot_id),
            "outcome": body.verification_outcome,
            "tree_presence": body.tree_presence,
        },
    )
    await db.commit()
    location_warnings = list((visit.signals or {}).get("location_warnings") or [])
    return FieldVisitOut(
        id=str(visit.id),
        plot_id=str(visit.plot_id),
        status=visit.status,
        idempotency_key=visit.idempotency_key,
        gps_integrity_passed=visit.gps_integrity_passed,
        photo_integrity_passed=visit.photo_integrity_passed,
        verification_outcome=visit.verification_outcome,
        tree_presence=visit.tree_presence,
        trees_observed=visit.trees_observed,
        trees_alive=visit.trees_alive,
        canopy_cover_pct=float(visit.canopy_cover_pct) if visit.canopy_cover_pct else None,
        visitor_lat=float(visit.visitor_lat) if visit.visitor_lat is not None else None,
        visitor_lon=float(visit.visitor_lon) if visit.visitor_lon is not None else None,
        distance_from_plot_m=float(visit.distance_from_plot_m)
        if visit.distance_from_plot_m is not None
        else None,
        inside_boundary=visit.inside_boundary,
        photo_keys=list(visit.photo_keys or []),
        location_warnings=location_warnings,
        visited_at=visit.visited_at,
        notes=visit.notes,
        epistemic_label=visit.epistemic_label,
    )


@router.post(
    "/{engagement_id}/field-verification/complete",
    response_model=FieldVerificationCompleteOut,
)
async def complete_engagement_field_verification(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> FieldVerificationCompleteOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_sampling.visits import complete_field_verification

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        result = await complete_field_verification(db, row)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.field.complete",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff=result,
    )
    await db.commit()
    return FieldVerificationCompleteOut.model_validate(result)


@router.get("/{engagement_id}/export/readiness", response_model=ExportReadinessOut)
async def get_export_readiness(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> ExportReadinessOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_export.readiness import export_readiness

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    summary = await export_readiness(db, row)
    return ExportReadinessOut.model_validate(summary)


@router.post("/{engagement_id}/exports", response_model=AuditExportCreateOut)
async def create_audit_export(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> AuditExportCreateOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_export.bundle import build_audit_engagement_bundle
    from app.services.audit_governance.access import require_audit_engagement_write

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        await require_audit_engagement_write(user, project, db)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    from app.services.intelligence.integration_gates import (
        IntegrationGateError,
        assert_audit_export_integrations,
    )

    try:
        assert_audit_export_integrations()
    except IntegrationGateError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": exc.code, "blocked_integrations": exc.blocked},
        ) from exc

    try:
        _zip_bytes, summary, signature = await build_audit_engagement_bundle(
            db,
            row,
            project,
            created_by_user_id=user.id,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.export.create",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff=summary,
    )
    await db.commit()
    return AuditExportCreateOut(
        export_id=summary["export_id"],
        cycle_id=summary["cycle_id"],
        engagement_id=summary["engagement_id"],
        content_manifest_hash=summary["content_manifest_hash"],
        unsigned_bundle_hash=summary["unsigned_bundle_hash"],
        package_sha256=summary["package_sha256"],
        file_count=summary["file_count"],
        zip_size_bytes=summary["zip_size_bytes"],
        signed=summary["signed"],
        signature_key_id=summary.get("signature_key_id"),
        status=summary["status"],
    )


@router.get("/{engagement_id}/export")
async def download_audit_export(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> Response:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_export.bundle import build_audit_engagement_bundle

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    from app.services.intelligence.integration_gates import (
        IntegrationGateError,
        assert_audit_export_integrations,
    )

    try:
        assert_audit_export_integrations()
    except IntegrationGateError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": exc.code, "blocked_integrations": exc.blocked},
        ) from exc

    try:
        zip_bytes, summary, signature = await build_audit_engagement_bundle(
            db,
            row,
            project,
            created_by_user_id=user.id,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    from app.services.audit_export.reconciliation import build_confidence_field_reconciliation
    from app.services.webhooks.audit_events import emit_audit_webhook

    reconciliation = await build_confidence_field_reconciliation(db, row.id)
    await emit_audit_webhook(
        db,
        organization_id=row.organization_id or project.organization_id,
        event_type="audit.export_ready",
        payload={
            "engagement_id": str(row.id),
            "project_id": str(project.id),
            "project_code": project.code,
            "status": row.status,
            "export_bundle_sha256": summary.get("bundle_sha256"),
            "file_count": summary.get("file_count"),
            "signed": summary.get("signed"),
        },
    )
    if reconciliation.get("mismatch_count", 0) > 0:
        await emit_audit_webhook(
            db,
            organization_id=row.organization_id or project.organization_id,
            event_type="audit.reconciliation_mismatch",
            payload={
                "engagement_id": str(row.id),
                "project_id": str(project.id),
                "project_code": project.code,
                "mismatch_count": reconciliation.get("mismatch_count", 0),
                "no_field_data_count": reconciliation.get("no_field_data_count", 0),
                "aligned_count": reconciliation.get("aligned_count", 0),
            },
        )

    safe_code = project.code.replace("/", "-")

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.export.generate",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={**summary, "signature_key_id": signature.key_id if signature else None},
    )
    await db.commit()

    headers = {
        "Content-Disposition": f'attachment; filename="{safe_code}-estate-watch-audit.zip"',
    }
    if signature is not None:
        headers["X-BYOT-Evidence-SHA256"] = signature.zip_sha256
        headers["X-BYOT-Evidence-Signature"] = signature.signature_b64
        headers["X-BYOT-Evidence-Key-Id"] = signature.key_id

    return Response(content=zip_bytes, media_type="application/zip", headers=headers)


@router.get("/{engagement_id}/export/summary", response_model=ExportSummaryOut)
async def get_audit_export_summary(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> ExportSummaryOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_export.queries import export_to_dict, latest_export_for_engagement
    from app.services.audit_governance.access import require_audit_engagement_read

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        await require_audit_engagement_read(user, project, db)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    export_row = await latest_export_for_engagement(db, engagement_id=row.id)
    if export_row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="export_not_generated")

    payload = export_to_dict(export_row)
    return ExportSummaryOut(
        engagement_id=str(row.id),
        cycle_id=payload["cycle_id"],
        export_id=payload["export_id"],
        project_id=str(project.id),
        project_code=project.code,
        file_count=payload["file_count"],
        bundle_sha256=payload["unsigned_bundle_hash"],
        content_manifest_hash=payload["content_manifest_hash"],
        unsigned_bundle_hash=payload["unsigned_bundle_hash"],
        package_sha256=payload["package_sha256"],
        zip_size_bytes=payload["zip_size_bytes"],
        signed=payload["signed"],
        signature_key_id=payload["signature_key_id"],
        status=row.status,
    )


@router.get("/{engagement_id}/exports", response_model=list[AuditExportListItemOut])
async def list_audit_exports(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
    limit: int = 20,
) -> list[AuditExportListItemOut]:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_export.queries import export_to_dict, list_exports_for_engagement
    from app.services.audit_governance.access import require_audit_engagement_read

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        await require_audit_engagement_read(user, project, db)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    exports = await list_exports_for_engagement(db, engagement_id=row.id, limit=min(limit, 50))
    return [AuditExportListItemOut.model_validate(export_to_dict(e)) for e in exports]


@router.get("/{engagement_id}/exports/{export_id}", response_model=AuditExportDetailOut)
async def get_audit_export_detail(
    engagement_id: uuid.UUID,
    export_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AuditExportDetailOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_export.queries import export_to_dict, get_export_for_engagement
    from app.services.audit_governance.access import require_audit_engagement_read

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        await require_audit_engagement_read(user, project, db)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    export_row = await get_export_for_engagement(db, engagement_id=row.id, export_id=export_id)
    if export_row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="export_not_found")
    return AuditExportDetailOut.model_validate(export_to_dict(export_row, include_files=True))


@router.get("/{engagement_id}/exports/{export_id}/download")
async def download_frozen_audit_export(
    engagement_id: uuid.UUID,
    export_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> Response:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_export.artifacts import get_export_artifact_bytes
    from app.services.audit_export.queries import get_export_for_engagement
    from app.services.audit_governance.access import require_audit_engagement_read

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        await require_audit_engagement_read(user, project, db)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    export_row = await get_export_for_engagement(db, engagement_id=row.id, export_id=export_id)
    if export_row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="export_not_found")

    zip_bytes = await get_export_artifact_bytes(db, export_id=export_row.id)
    if zip_bytes is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="export_artifact_not_found")

    safe_code = project.code.replace("/", "-")
    headers = {
        "Content-Disposition": f'attachment; filename="{safe_code}-estate-watch-audit-{export_id}.zip"',
        "X-BYOT-Export-Id": str(export_row.id),
        "X-BYOT-Package-SHA256": export_row.package_sha256,
    }
    if export_row.signature_json:
        headers["X-BYOT-Evidence-SHA256"] = export_row.signature_json.get("zip_sha256", "")
        headers["X-BYOT-Evidence-Signature"] = export_row.signature_json.get("signature_b64", "")
        headers["X-BYOT-Evidence-Key-Id"] = export_row.signature_key_id or ""
    return Response(content=zip_bytes, media_type="application/zip", headers=headers)


@router.post(
    "/{engagement_id}/exports/{export_id}/verify",
    response_model=AuditExportVerificationOut,
)
async def verify_audit_export(
    engagement_id: uuid.UUID,
    export_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AuditExportVerificationOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_export.queries import get_export_for_engagement
    from app.services.audit_export.verify_export import verify_frozen_export
    from app.services.audit_governance.access import require_audit_engagement_verify

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        await require_audit_engagement_verify(user, project, db)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    export_row = await get_export_for_engagement(db, engagement_id=row.id, export_id=export_id)
    if export_row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="export_not_found")

    verification = await verify_frozen_export(db, export=export_row, verified_by_user_id=user.id)
    await db.commit()
    return AuditExportVerificationOut(
        export_id=str(export_row.id),
        valid=verification.valid,
        verified_at=verification.verified_at.isoformat(),
        details=verification.details,
    )


@router.get("/methodologies", response_model=list[AuditMethodologyOut])
async def list_audit_methodologies(user: CurrentUser, db: DB) -> list[AuditMethodologyOut]:
    from app.services.audit_governance.methodology_resolver import list_methodologies

    rows = await list_methodologies(db)
    return [
        AuditMethodologyOut(
            version=r.version,
            name=r.name,
            description=r.description,
            status=r.status,
            effective_from=r.effective_from.isoformat() if r.effective_from else None,
        )
        for r in rows
    ]


@router.get("/methodologies/{version}", response_model=AuditMethodologyBundleOut)
async def get_audit_methodology_bundle(
    version: str,
    user: CurrentUser,
    db: DB,
) -> AuditMethodologyBundleOut:
    from app.services.audit_governance.methodology_resolver import get_methodology_bundle

    bundle = await get_methodology_bundle(db, version)
    if bundle is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="methodology_not_found")
    return AuditMethodologyBundleOut.model_validate(bundle)


@router.get("/{engagement_id}/methodology", response_model=AuditMethodologyBindingOut)
async def get_engagement_methodology_binding(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AuditMethodologyBindingOut:
    from sqlalchemy import select

    from app.models.audit_engagement import AuditEngagement
    from app.models.audit_methodology_governance import AuditEngagementMethodologyOverride
    from app.services.audit_governance.access import require_audit_engagement_read
    from app.services.audit_governance.methodology_resolver import (
        resolve_engagement_methodology_version,
    )

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        await require_audit_engagement_read(user, project, db)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    version = await resolve_engagement_methodology_version(db, row)
    override = (
        await db.execute(
            select(AuditEngagementMethodologyOverride).where(
                AuditEngagementMethodologyOverride.engagement_id == row.id
            )
        )
    ).scalar_one_or_none()
    return AuditMethodologyBindingOut(
        engagement_id=str(row.id),
        methodology_version=version,
        threshold_overrides=override.threshold_overrides if override else {},
    )


@router.put("/{engagement_id}/methodology", response_model=AuditMethodologyBindingOut)
async def update_engagement_methodology_binding(
    engagement_id: uuid.UUID,
    body: AuditMethodologyBindingUpdate,
    user: WriteAccess,
    db: DB,
) -> AuditMethodologyBindingOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_governance.access import require_audit_engagement_write
    from app.services.audit_governance.methodology_resolver import bind_engagement_methodology

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        await require_audit_engagement_write(user, project, db)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    try:
        binding = await bind_engagement_methodology(
            db,
            engagement=row,
            methodology_version=body.methodology_version,
            threshold_overrides=body.threshold_overrides,
            changed_by_user_id=user.id,
            reason=body.reason,
        )
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="methodology_not_found") from None
    await db.commit()
    return AuditMethodologyBindingOut(
        engagement_id=str(row.id),
        methodology_version=binding.methodology_version,
        threshold_overrides=binding.threshold_overrides,
    )


@router.get(
    "/{engagement_id}/methodology/change-log",
    response_model=list[AuditMethodologyChangeLogOut],
)
async def get_engagement_methodology_change_log(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> list[AuditMethodologyChangeLogOut]:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_governance.access import require_audit_engagement_read
    from app.services.audit_governance.methodology_resolver import list_methodology_change_log

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    try:
        await require_audit_engagement_read(user, project, db)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    logs = await list_methodology_change_log(db, engagement_id=row.id)
    return [
        AuditMethodologyChangeLogOut(
            id=str(log.id),
            engagement_id=str(log.engagement_id),
            from_version=log.from_version,
            to_version=log.to_version,
            reason=log.reason,
            changed_at=log.changed_at.isoformat(),
        )
        for log in logs
    ]


@router.get("/{engagement_id}/integrity-bridge", response_model=AuditIntegrityBridgeOut)
async def get_engagement_integrity_bridge(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AuditIntegrityBridgeOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_integrity.bridge import build_audit_integrity_bridge

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    payload = await build_audit_integrity_bridge(db, row, project)
    return AuditIntegrityBridgeOut.model_validate(payload)


@router.get("/{engagement_id}/cycles", response_model=AuditCycleSummaryOut)
async def get_engagement_audit_cycles(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AuditCycleSummaryOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_reaudit.cycle import cycle_summary

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    return AuditCycleSummaryOut.model_validate(await cycle_summary(db, row))


@router.get("/{engagement_id}/cycles/current", response_model=KernelAuditCycleOut)
async def get_current_engagement_audit_cycle(engagement_id: uuid.UUID, user: CurrentUser, db: DB):
    from app.services.audit_cycles.queries import get_current_cycle

    engagement = await _load_managed_engagement(db, engagement_id, user)
    cycle = await get_current_cycle(db, engagement.id)
    if cycle is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="audit_cycle_not_found")
    return KernelAuditCycleOut.model_validate(cycle)


@router.get("/{engagement_id}/cycles/{cycle_id}", response_model=KernelAuditCycleOut)
async def get_engagement_audit_cycle(engagement_id: uuid.UUID, cycle_id: uuid.UUID, user: CurrentUser, db: DB):
    from app.services.audit_cycles.queries import get_cycle

    await _load_managed_engagement(db, engagement_id, user)
    cycle = await get_cycle(db, cycle_id)
    if cycle is None or cycle.engagement_id != engagement_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="audit_cycle_not_found")
    return KernelAuditCycleOut.model_validate(cycle)


@router.post("/{engagement_id}/cycles", response_model=KernelAuditCycleOut, status_code=status.HTTP_201_CREATED)
async def create_engagement_audit_cycle(engagement_id: uuid.UUID, body: AuditCycleCreate, request: Request, user: WriteAccess, db: DB):
    from app.services.audit_cycles.service import create_cycle

    engagement = await _load_managed_engagement(db, engagement_id, user)
    try:
        cycle = await create_cycle(db, engagement, started_by_user_id=user.id, **body.model_dump())
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    await record_audit(db, actor=user, action="audit_cycle.create", resource_type="audit_cycle", resource_id=cycle.id, request=request)
    await db.commit()
    return KernelAuditCycleOut.model_validate(cycle)


@router.post("/{engagement_id}/cycles/{cycle_id}/transition", response_model=KernelAuditCycleOut)
async def transition_engagement_audit_cycle(engagement_id: uuid.UUID, cycle_id: uuid.UUID, body: AuditCycleTransition, request: Request, user: WriteAccess, db: DB):
    from app.services.audit_cycles.queries import get_cycle
    from app.services.audit_cycles.service import transition_cycle

    await _load_managed_engagement(db, engagement_id, user)
    existing = await get_cycle(db, cycle_id)
    if existing is None or existing.engagement_id != engagement_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="audit_cycle_not_found")
    try:
        cycle = await transition_cycle(db, cycle_id, target_status=body.status, closed_by_user_id=user.id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    await record_audit(db, actor=user, action="audit_cycle.transition", resource_type="audit_cycle", resource_id=cycle.id, request=request, diff={"status": cycle.status})
    await db.commit()
    return KernelAuditCycleOut.model_validate(cycle)


@router.post("/{engagement_id}/cycles/{cycle_id}/reaudit", response_model=KernelAuditCycleOut, status_code=status.HTTP_201_CREATED)
async def start_cycle_reaudit(engagement_id: uuid.UUID, cycle_id: uuid.UUID, body: ReauditCycleCreate, request: Request, user: WriteAccess, db: DB):
    from app.services.audit_cycles.queries import get_cycle
    from app.services.audit_cycles.service import start_reaudit_cycle

    engagement = await _load_managed_engagement(db, engagement_id, user)
    existing = await get_cycle(db, cycle_id)
    if existing is None or existing.engagement_id != engagement_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="audit_cycle_not_found")
    try:
        cycle = await start_reaudit_cycle(db, engagement, started_by_user_id=user.id, **body.model_dump())
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    await record_audit(db, actor=user, action="audit_cycle.reaudit.start", resource_type="audit_cycle", resource_id=cycle.id, request=request, diff={"parent_cycle_id": str(existing.id)})
    await db.commit()
    return KernelAuditCycleOut.model_validate(cycle)


@router.post("/{engagement_id}/reaudit", response_model=ReauditStartOut)
async def start_engagement_reaudit(
    engagement_id: uuid.UUID,
    body: ReauditStartCreate,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> ReauditStartOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_reaudit.cycle import start_reaudit_cycle

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        result = await start_reaudit_cycle(db, row, notes=body.notes)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.reaudit.start",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={
            "current_cycle": result["current_cycle"],
            "archived_cycles": result["archived_cycles"],
            "plots_reset": result["plots_reset"],
        },
    )
    return ReauditStartOut.model_validate(result)


@router.get("/{engagement_id}/attestation", response_model=AttestationSummaryOut)
async def get_engagement_attestation(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AttestationSummaryOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_attestation.attest import attestation_summary

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    summary = await attestation_summary(db, row, current_user_id=user.id)
    return AttestationSummaryOut.model_validate(summary)


@router.get("/{engagement_id}/anomaly-reviews", response_model=AnomalyReviewQueueOut)
async def get_anomaly_review_queue(
    engagement_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AnomalyReviewQueueOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_attestation.review import anomaly_review_queue

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")

    summary = await anomaly_review_queue(db, row.id)
    return AnomalyReviewQueueOut.model_validate(summary)


@router.post(
    "/{engagement_id}/anomalies/{anomaly_id}/review",
    response_model=AnomalyReviewOut,
)
async def review_engagement_anomaly(
    engagement_id: uuid.UUID,
    anomaly_id: uuid.UUID,
    body: AnomalyReviewCreate,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> AnomalyReviewOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_attestation.review import review_anomaly

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        review = await review_anomaly(
            db,
            row,
            anomaly_id=anomaly_id,
            reviewer_id=user.id,
            disposition=body.disposition,
            rationale=body.rationale,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.anomaly.review",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={
            "anomaly_id": str(anomaly_id),
            "disposition": body.disposition,
            "new_status": review.new_status,
        },
    )
    await db.commit()
    return AnomalyReviewOut(
        id=str(review.id),
        anomaly_id=str(review.anomaly_id),
        disposition=review.disposition,
        previous_status=review.previous_status,
        new_status=review.new_status,
        rationale=review.rationale,
        reviewed_at=review.reviewed_at,
        epistemic_label=review.epistemic_label,
    )


@router.post("/{engagement_id}/attestation/sign")
async def sign_engagement_attestation(
    engagement_id: uuid.UUID,
    body: AttestationSignCreate,
    request: Request,
    user: WriteAccess,
    db: DB,
) -> AttestationOut:
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_attestation.attest import sign_attestation

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        attestation = await sign_attestation(
            db,
            row,
            reviewer_id=user.id,
            verdict=body.verdict,
            summary=body.summary,
            notes=body.notes,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    attestation_hash = getattr(attestation, "attestation_hash", None)
    await record_audit(
        db,
        actor=user,
        action="audit_engagement.attestation.sign",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={
            "verdict": body.verdict,
            "attestation_hash": attestation_hash,
            "status": row.status,
        },
    )
    await db.commit()

    if hasattr(attestation, "attestation_hash") and attestation.attestation_hash:
        return AttestationOut(
            id=str(attestation.id),
            verdict=attestation.verdict,
            summary=attestation.summary,
            notes=attestation.notes,
            status=attestation.status,
            export_bundle_sha256=attestation.export_bundle_sha256,
            attestation_hash=attestation.attestation_hash,
            epistemic_label=attestation.epistemic_label,
            signed_at=attestation.signed_at,
            reviewer_id=str(attestation.reviewer_id) if attestation.reviewer_id else None,
        )

    from app.schemas.audit_attestation import AttestationSignatureOut

    return AttestationSignatureOut(
        id=str(attestation.id),
        role=attestation.role,
        verdict=attestation.verdict,
        summary=attestation.summary,
        notes=attestation.notes,
        signature_hash=attestation.signature_hash,
        epistemic_label=attestation.epistemic_label,
        signed_at=attestation.signed_at,
        reviewer_id=str(attestation.reviewer_id) if attestation.reviewer_id else None,
    )


@router.post("/{engagement_id}/attestation/cosign")
async def cosign_engagement_attestation(
    engagement_id: uuid.UUID,
    body: AttestationCosignCreate,
    request: Request,
    user: WriteAccess,
    db: DB,
):
    from app.models.audit_attestation import AuditAttestationSignature, AuditReviewerAttestation
    from app.models.audit_engagement import AuditEngagement
    from app.services.audit_attestation.attest import cosign_attestation

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    try:
        result = await cosign_attestation(db, row, reviewer_id=user.id, notes=body.notes)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    attestation_hash = getattr(result, "attestation_hash", None)
    await record_audit(
        db,
        actor=user,
        action="audit_engagement.attestation.cosign",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={
            "attestation_hash": attestation_hash,
            "status": row.status,
        },
    )
    await db.commit()

    if isinstance(result, AuditReviewerAttestation):
        return AttestationOut(
            id=str(result.id),
            verdict=result.verdict,
            summary=result.summary,
            notes=result.notes,
            status=result.status,
            export_bundle_sha256=result.export_bundle_sha256,
            attestation_hash=result.attestation_hash,
            epistemic_label=result.epistemic_label,
            signed_at=result.signed_at,
            reviewer_id=str(result.reviewer_id) if result.reviewer_id else None,
        )

    sig: AuditAttestationSignature = result
    from app.schemas.audit_attestation import AttestationSignatureOut

    return AttestationSignatureOut(
        id=str(sig.id),
        role=sig.role,
        verdict=sig.verdict,
        summary=sig.summary,
        notes=sig.notes,
        signature_hash=sig.signature_hash,
        epistemic_label=sig.epistemic_label,
        signed_at=sig.signed_at,
        reviewer_id=str(sig.reviewer_id) if sig.reviewer_id else None,
    )


@router.post("/{engagement_id}/verification-link")
async def create_audit_verification_link(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
):
    from app.models.audit_engagement import AuditEngagement
    from app.schemas.public_verification import VerificationLinkOut
    from app.services.public_verification.builder import create_verification_link, public_verify_url

    row = await db.get(AuditEngagement, engagement_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="engagement_not_found")
    project = await load_project(row.project_id, user, db)
    if project is None or not await can_manage_project(user, project, db):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")

    link = await create_verification_link(
        db,
        resource_type="audit_engagement",
        resource_id=row.id,
        organization_id=row.organization_id or project.organization_id,
        label=f"Estate Watch audit — {project.code}",
        created_by_user_id=user.id,
    )
    meta = dict(row.metadata_ or {})
    meta["public_verify_url"] = public_verify_url(link.token)
    row.metadata_ = meta

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.verification_link.create",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={"token_preview": link.token[:8]},
    )
    await db.commit()
    await db.refresh(link)
    return VerificationLinkOut(
        id=link.id,
        token=link.token,
        resource_type=link.resource_type,
        resource_id=link.resource_id,
        label=link.label,
        public_url=public_verify_url(link.token),
        expires_at=link.expires_at,
        revoked_at=link.revoked_at,
        view_count=link.view_count,
        last_viewed_at=link.last_viewed_at,
        created_at=link.created_at,
    )
