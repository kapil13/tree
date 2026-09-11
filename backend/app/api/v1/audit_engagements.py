"""Estate Watch audit intake API (Phase 1)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status

from app.api.v1.deps import DB, CurrentUser, WriteAccess
from app.schemas.audit_confidence import ConfidenceComputeOut, ConfidenceMapOut
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
from app.schemas.audit_risk import AnomaliesSummaryOut, AuditorQueueOut, RiskScanOut
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
        latest_gis_validation=GisValidationRunOut.model_validate(gis) if gis else None,
        intake_gate=IntakeGateOut.model_validate(gate) if gate else None,
    )


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
    return KmlImportResult(
        imported=len(created),
        boundaries=[BoundaryVersionOut.model_validate(_boundary_out(b)) for b in created],
    )


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
    raw = await engagement_detail(db, row, project)
    return _serialize_detail(raw)


@router.post("/{engagement_id}/confidence-map/compute", response_model=ConfidenceComputeOut)
async def compute_confidence_map(
    engagement_id: uuid.UUID,
    request: Request,
    user: WriteAccess,
    db: DB,
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
        assessments = await compute_confidence_map(db, row)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    grade_counts: dict[str, int] = {}
    for a in assessments:
        grade_counts[a.confidence_grade] = grade_counts.get(a.confidence_grade, 0) + 1

    await record_audit(
        db,
        actor=user,
        action="audit_engagement.confidence.compute",
        resource_type="audit_engagement",
        resource_id=row.id,
        request=request,
        diff={"computed": len(assessments), "grade_counts": grade_counts},
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
