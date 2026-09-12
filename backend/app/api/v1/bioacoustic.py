"""Bioacoustic recording and biodiversity analysis endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select

from app.api.v1.deps import DB, CurrentUser, WriteProfessional
from app.models.bioacoustic_analysis_run import BioacousticAnalysisRun
from app.models.bioacoustic_monitoring_period import BioacousticMonitoringPeriod
from app.models.bioacoustic_recording import BioacousticRecording
from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.schemas.bioacoustic import (
    AudioUrlOut,
    AuditBundleOut,
    BaselineDeltaOut,
    BioacousticAnalysisRunOut,
    BioacousticAnalyzeResponse,
    BioacousticRecordingCreate,
    BioacousticRecordingOut,
    BioacousticSummary,
    ComplianceEvidenceCreate,
    ComplianceEvidenceOut,
    DetectionReviewCreate,
    DetectionReviewOut,
    FenceTrendsOut,
    HotspotOut,
    InterpretationChainOut,
    MonitoringPeriodCreate,
    MonitoringPeriodOut,
    MonitoringPlanOut,
    PeriodComparisonOut,
    RegionalFaunaOut,
    ReviewQueueItem,
)
from app.schemas.cursor_page import CursorPage
from app.services.bioacoustic.audit_bundle import build_audit_bundle
from app.services.bioacoustic.baseline_delta import compute_baseline_delta
from app.services.bioacoustic.compliance_evidence import (
    link_recording_to_checklist,
    list_project_bioacoustic_evidence,
)
from app.services.bioacoustic.confidence import METHODOLOGY_VERSION
from app.services.bioacoustic.detection_tiers import TIER_ACCEPTED
from app.services.bioacoustic.hotspots import compute_hotspots
from app.services.bioacoustic.interpretation_chain import build_interpretation_chain
from app.services.bioacoustic.map_layer import build_map_layer
from app.services.bioacoustic.methodology import SCIENTIFIC_LIMITATIONS
from app.services.bioacoustic.monitoring_periods import (
    compare_monitoring_periods,
    create_monitoring_period,
    list_monitoring_periods,
)
from app.services.bioacoustic.monitoring_plans import (
    ensure_monitoring_plans_for_project,
    list_monitoring_plans,
)
from app.services.bioacoustic.ops import create_recording, enqueue_bioacoustic_analysis
from app.services.bioacoustic.regional_fauna import build_regional_fauna
from app.services.bioacoustic.review import list_review_queue, submit_detection_review
from app.services.bioacoustic.trends import compute_fence_trends
from app.services.data_scope import apply_owner_org_scope
from app.services.pagination.cursor import CursorError, decode_cursor, encode_cursor
from app.services.platform.governance import assert_org_feature_enabled
from app.services.storage import get_storage

router = APIRouter(prefix="/bioacoustic", tags=["bioacoustic"])

MAX_AUDIO_BYTES = 50 * 1024 * 1024

_THREATENED = {"Critically Endangered", "Endangered", "Vulnerable"}


def _scope(stmt, user):
    return apply_owner_org_scope(
        stmt,
        user,
        owner_col=BioacousticRecording.owner_user_id,
        org_col=BioacousticRecording.organization_id,
    )


@router.post("/recordings", response_model=BioacousticRecordingOut, status_code=status.HTTP_201_CREATED)
async def register_recording(
    payload: BioacousticRecordingCreate, user: WriteProfessional, db: DB
) -> BioacousticRecordingOut:
    await assert_org_feature_enabled(db, user, "bioacoustic")
    try:
        return await create_recording(
            db,
            user,
            s3_key=payload.s3_key,
            duration_seconds=payload.duration_seconds,
            latitude=payload.latitude,
            longitude=payload.longitude,
            plantation_fence_id=payload.plantation_fence_id,
            recorded_at=payload.recorded_at,
            recording_started_at=payload.recording_started_at,
            recording_ended_at=payload.recording_ended_at,
            gps_accuracy_m=payload.gps_accuracy_m,
            gps_source=payload.gps_source,
            gps_verified=payload.gps_verified,
            gps_fallback=payload.gps_fallback,
            metadata=payload.metadata,
        )
    except ValueError as exc:
        code = str(exc)
        if code == "fence_not_found":
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=code) from exc
        if code in {"forbidden", "s3_key_forbidden"}:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=code) from exc
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=code) from exc


@router.post("/recordings/upload", response_model=BioacousticRecordingOut, status_code=status.HTTP_201_CREATED)
async def upload_recording(
    user: WriteProfessional,
    db: DB,
    file: UploadFile = File(...),
    duration_seconds: float = Form(45.0),
    latitude: float = Form(0.0),
    longitude: float = Form(0.0),
    plantation_fence_id: uuid.UUID | None = Form(None),
    gps_accuracy_m: float | None = Form(None),
    gps_source: str | None = Form(None),
    gps_verified: bool | None = Form(None),
    gps_fallback: bool | None = Form(None),
    recording_started_at: datetime | None = Form(None),
    recording_ended_at: datetime | None = Form(None),
) -> BioacousticRecordingOut:
    """Direct multipart upload (mobile + web)."""
    await assert_org_feature_enabled(db, user, "bioacoustic")
    data = await file.read()
    if len(data) < 1000:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="audio_too_short")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="audio_too_large")
    if duration_seconds < 60:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="duration_below_minimum_60s")
    filename_lower = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    if filename_lower.endswith(".wav"):
        ext = ".wav"
    elif filename_lower.endswith(".webm") or content_type == "audio/webm":
        ext = ".webm"
    elif filename_lower.endswith(".m4a") or "mp4" in content_type:
        ext = ".m4a"
    elif filename_lower.endswith(".ogg") or content_type == "audio/ogg":
        ext = ".ogg"
    else:
        ext = ".webm"
    key = f"bioacoustic/{user.id}/{uuid.uuid4()}{ext}"
    storage = get_storage()
    try:
        storage.put_bytes(key, data, content_type=file.content_type or "audio/webm")
    except Exception as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="storage_upload_failed",
        ) from exc
    try:
        return await create_recording(
            db,
            user,
            s3_key=key,
            duration_seconds=duration_seconds,
            latitude=latitude,
            longitude=longitude,
            plantation_fence_id=plantation_fence_id,
            recording_started_at=recording_started_at,
            recording_ended_at=recording_ended_at,
            gps_accuracy_m=gps_accuracy_m,
            gps_source=gps_source,
            gps_verified=gps_verified,
            gps_fallback=gps_fallback,
            metadata={"filename": file.filename or "recording.webm"},
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="recording_create_failed",
        ) from exc


@router.get("/recordings", response_model=CursorPage[BioacousticRecordingOut])
async def list_recordings(
    user: CurrentUser,
    db: DB,
    limit: int = Query(50, ge=1, le=100),
    cursor: str | None = None,
) -> CursorPage[BioacousticRecordingOut]:
    stmt = _scope(select(BioacousticRecording), user)
    if cursor:
        try:
            cursor_at, cursor_id = decode_cursor(cursor)
        except CursorError as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid_cursor") from exc
        stmt = stmt.where(
            or_(
                BioacousticRecording.recorded_at < cursor_at,
                (BioacousticRecording.recorded_at == cursor_at)
                & (BioacousticRecording.id < cursor_id),
            )
        )
    stmt = stmt.order_by(
        BioacousticRecording.recorded_at.desc(),
        BioacousticRecording.id.desc(),
    ).limit(limit + 1)
    rows = (await db.execute(stmt)).scalars().all()
    items = [BioacousticRecordingOut.from_model(r) for r in rows[:limit]]
    next_cursor = None
    if len(rows) > limit:
        last = rows[limit - 1]
        next_cursor = encode_cursor(created_at=last.recorded_at, row_id=last.id)
    return CursorPage(items=items, next_cursor=next_cursor)


@router.get("/recordings/{recording_id}", response_model=BioacousticRecordingOut)
async def get_recording(recording_id: uuid.UUID, user: CurrentUser, db: DB) -> BioacousticRecordingOut:
    stmt = _scope(
        select(BioacousticRecording).where(BioacousticRecording.id == recording_id),
        user,
    )
    rec = (await db.execute(stmt)).scalar_one_or_none()
    if rec is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    return BioacousticRecordingOut.from_model(rec)


@router.post(
    "/recordings/{recording_id}/analyze",
    response_model=BioacousticAnalyzeResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def analyze_recording(
    recording_id: uuid.UUID,
    user: WriteProfessional,
    db: DB,
    force: bool = False,
) -> BioacousticAnalyzeResponse:
    """Queue BirdNET analysis on the Celery worker (poll GET /recordings/{id})."""
    await assert_org_feature_enabled(db, user, "bioacoustic")
    try:
        return await enqueue_bioacoustic_analysis(db, recording_id, user, force=force)
    except ValueError as exc:
        code = str(exc)
        if code == "not_found":
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=code) from exc
        if code == "forbidden":
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=code) from exc
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=code) from exc


@router.get(
    "/recordings/{recording_id}/analysis-runs",
    response_model=list[BioacousticAnalysisRunOut],
)
async def list_analysis_runs(
    recording_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> list[BioacousticAnalysisRunOut]:
    rec = (
        await db.execute(
            _scope(
                select(BioacousticRecording).where(BioacousticRecording.id == recording_id),
                user,
            )
        )
    ).scalar_one_or_none()
    if rec is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    runs = (
        await db.execute(
            select(BioacousticAnalysisRun)
            .where(BioacousticAnalysisRun.recording_id == recording_id)
            .order_by(BioacousticAnalysisRun.run_number.desc())
        )
    ).scalars().all()
    return [BioacousticAnalysisRunOut.model_validate(r) for r in runs]


@router.get("/regional-fauna", response_model=RegionalFaunaOut)
async def regional_fauna(
    user: CurrentUser,
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(25.0, ge=1, le=100),
    taxon_group: str | None = Query(None, description="bird, frog, amphibian, mammal, insect, reptile"),
) -> RegionalFaunaOut:
    """
    GBIF + IUCN regional species checklist for a GPS point.
    Use before recording to see expected fauna, or to validate detections.
    """
    groups = None
    if taxon_group:
        from app.services.bioacoustic.taxon_groups import detection_taxon_group

        groups = {detection_taxon_group(taxon_group)}
    data = build_regional_fauna(latitude, longitude, radius_km=radius_km, taxon_groups=groups)
    return RegionalFaunaOut(**data)


@router.get("/summary", response_model=BioacousticSummary)
async def bioacoustic_summary(
    user: CurrentUser,
    db: DB,
    plantation_fence_id: uuid.UUID | None = None,
) -> BioacousticSummary:
    total_stmt = select(func.count(BioacousticRecording.id))
    total_stmt = _scope(total_stmt, user)
    if plantation_fence_id:
        total_stmt = total_stmt.where(
            BioacousticRecording.plantation_fence_id == plantation_fence_id
        )
    total = int((await db.execute(total_stmt)).scalar() or 0)

    analyzed_stmt = _scope(select(BioacousticRecording), user).where(
        BioacousticRecording.status == "analyzed"
    )
    if plantation_fence_id:
        analyzed_stmt = analyzed_stmt.where(
            BioacousticRecording.plantation_fence_id == plantation_fence_id
        )
    analyzed_rows = (await db.execute(analyzed_stmt)).scalars().all()
    analyzed = len(analyzed_rows)

    avg_health = 0.0
    avg_shannon = 0.0
    avg_simpson = 0.0
    species_set: set[str] = set()
    threatened_set: set[str] = set()
    taxon_calls: dict[str, int] = {}
    if analyzed_rows:
        confidence_scores = [
            float(r.biodiversity_confidence_score or r.bioacoustic_health_score or 0)
            for r in analyzed_rows
        ]
        shannon_scores = [float(r.shannon_diversity_index or 0) for r in analyzed_rows]
        simpson_scores = [float(r.simpson_diversity_index or 0) for r in analyzed_rows]
        avg_health = round(sum(confidence_scores) / len(confidence_scores), 2)
        avg_shannon = round(sum(shannon_scores) / len(shannon_scores), 4)
        avg_simpson = round(sum(simpson_scores) / len(simpson_scores), 4)
        for r in analyzed_rows:
            for det in r.species_detections or []:
                if det.get("detection_tier") != TIER_ACCEPTED:
                    continue
                name = det.get("scientific_name", "")
                if name:
                    species_set.add(name)
                if det.get("iucn_status") in _THREATENED and name:
                    threatened_set.add(name)
                tg = det.get("taxon_group", "unknown")
                taxon_calls[tg] = taxon_calls.get(tg, 0) + int(det.get("call_count") or 0)

    recent_stmt = (
        _scope(select(BioacousticRecording), user)
        .order_by(BioacousticRecording.recorded_at.desc())
        .limit(5)
    )
    if plantation_fence_id:
        recent_stmt = recent_stmt.where(
            BioacousticRecording.plantation_fence_id == plantation_fence_id
        )
    recent = (await db.execute(recent_stmt)).scalars().all()

    return BioacousticSummary(
        total_recordings=total,
        analyzed_recordings=analyzed,
        avg_confidence_score=avg_health,
        avg_health_score=avg_health,
        avg_shannon_index=avg_shannon,
        avg_simpson_index=avg_simpson,
        total_accepted_species=len(species_set),
        total_species_detected=len(species_set),
        threatened_species_count=len(threatened_set),
        taxon_breakdown=taxon_calls,
        recent_recordings=[BioacousticRecordingOut.from_model(r) for r in recent],
        methodology_version=METHODOLOGY_VERSION,
        scientific_limitations=list(SCIENTIFIC_LIMITATIONS),
    )


@router.get("/review-queue", response_model=list[ReviewQueueItem])
async def review_queue(
    user: CurrentUser,
    db: DB,
    plantation_fence_id: uuid.UUID | None = None,
) -> list[ReviewQueueItem]:
    stmt = _scope(select(BioacousticRecording), user).where(BioacousticRecording.status == "analyzed")
    if plantation_fence_id:
        stmt = stmt.where(BioacousticRecording.plantation_fence_id == plantation_fence_id)
    rows = (await db.execute(stmt.order_by(BioacousticRecording.recorded_at.desc()).limit(200))).scalars().all()
    items = await list_review_queue(db, list(rows))
    return [ReviewQueueItem(**item) for item in items]


@router.post(
    "/recordings/{recording_id}/reviews",
    response_model=DetectionReviewOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_detection_review(
    recording_id: uuid.UUID,
    payload: DetectionReviewCreate,
    user: WriteProfessional,
    db: DB,
) -> DetectionReviewOut:
    await assert_org_feature_enabled(db, user, "bioacoustic")
    rec = (
        await db.execute(
            _scope(select(BioacousticRecording).where(BioacousticRecording.id == recording_id), user)
        )
    ).scalar_one_or_none()
    if rec is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    try:
        review = await submit_detection_review(
            db,
            recording=rec,
            reviewer_user_id=user.id,
            scientific_name=payload.scientific_name,
            decision=payload.decision,
            notes=payload.notes,
            analysis_run_id=payload.analysis_run_id or rec.latest_analysis_run_id,
        )
        await db.commit()
        await db.refresh(review)
        return DetectionReviewOut.model_validate(review)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/recordings/{recording_id}/audio-url", response_model=AudioUrlOut)
async def recording_audio_url(
    recording_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
    analysis_run_id: uuid.UUID | None = None,
    expires_in: int = Query(900, ge=60, le=3600),
) -> AudioUrlOut:
    rec = (
        await db.execute(
            _scope(select(BioacousticRecording).where(BioacousticRecording.id == recording_id), user)
        )
    ).scalar_one_or_none()
    if rec is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    storage = get_storage()
    url = storage.presigned_get(rec.s3_key, expires_in=expires_in)
    return AudioUrlOut(
        recording_id=rec.id,
        analysis_run_id=analysis_run_id or rec.latest_analysis_run_id,
        url=url,
        expires_in=expires_in,
    )


@router.get("/recordings/{recording_id}/interpretation-chain", response_model=InterpretationChainOut)
async def interpretation_chain(
    recording_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> InterpretationChainOut:
    rec = (
        await db.execute(
            _scope(select(BioacousticRecording).where(BioacousticRecording.id == recording_id), user)
        )
    ).scalar_one_or_none()
    if rec is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    data = build_interpretation_chain(rec)
    return InterpretationChainOut(**data)


@router.get("/map-layer")
async def biodiversity_map_layer(
    user: CurrentUser,
    db: DB,
    plantation_fence_id: uuid.UUID | None = None,
) -> dict:
    stmt = _scope(select(BioacousticRecording), user)
    if plantation_fence_id:
        stmt = stmt.where(BioacousticRecording.plantation_fence_id == plantation_fence_id)
    recordings = list((await db.execute(stmt.order_by(BioacousticRecording.recorded_at.desc()).limit(500))).scalars().all())

    fence_ids = {r.plantation_fence_id for r in recordings if r.plantation_fence_id}
    if plantation_fence_id:
        fence_ids.add(plantation_fence_id)
    fences: list[PlantationFence] = []
    if fence_ids:
        fences = list(
            (
                await db.execute(select(PlantationFence).where(PlantationFence.id.in_(fence_ids)))
            ).scalars().all()
        )
    return build_map_layer(recordings, fences)


@router.get("/hotspots", response_model=list[HotspotOut])
async def biodiversity_hotspots(
    user: CurrentUser,
    db: DB,
    plantation_fence_id: uuid.UUID,
    min_recordings: int = Query(2, ge=2, le=10),
) -> list[HotspotOut]:
    rows = list(
        (
            await db.execute(
                _scope(select(BioacousticRecording), user).where(
                    BioacousticRecording.plantation_fence_id == plantation_fence_id
                )
            )
        ).scalars().all()
    )
    hotspots = compute_hotspots(rows, min_recordings=min_recordings)
    return [HotspotOut(**h) for h in hotspots]


@router.post("/monitoring-periods", response_model=MonitoringPeriodOut, status_code=status.HTTP_201_CREATED)
async def create_monitoring_period_route(
    payload: MonitoringPeriodCreate,
    user: WriteProfessional,
    db: DB,
) -> MonitoringPeriodOut:
    await assert_org_feature_enabled(db, user, "bioacoustic")
    fence = (
        await db.execute(
            apply_owner_org_scope(
                select(PlantationFence).where(PlantationFence.id == payload.fence_id),
                user,
                owner_col=PlantationFence.owner_user_id,
                org_col=PlantationFence.organization_id,
            )
        )
    ).scalar_one_or_none()
    if fence is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="fence_not_found")
    try:
        period = await create_monitoring_period(
            db,
            fence_id=payload.fence_id,
            label=payload.label,
            period_start=payload.period_start,
            period_end=payload.period_end,
            season_class=payload.season_class,
            metadata=payload.metadata,
        )
        await db.commit()
        await db.refresh(period)
        return MonitoringPeriodOut.from_model(period)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/monitoring-periods", response_model=list[MonitoringPeriodOut])
async def list_monitoring_periods_route(
    user: CurrentUser,
    db: DB,
    fence_id: uuid.UUID,
) -> list[MonitoringPeriodOut]:
    fence = (
        await db.execute(
            apply_owner_org_scope(
                select(PlantationFence).where(PlantationFence.id == fence_id),
                user,
                owner_col=PlantationFence.owner_user_id,
                org_col=PlantationFence.organization_id,
            )
        )
    ).scalar_one_or_none()
    if fence is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="fence_not_found")
    periods = await list_monitoring_periods(db, fence_id)
    return [MonitoringPeriodOut.from_model(p) for p in periods]


@router.get(
    "/monitoring-periods/{period_a_id}/compare/{period_b_id}",
    response_model=PeriodComparisonOut,
)
async def compare_periods_route(
    period_a_id: uuid.UUID,
    period_b_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> PeriodComparisonOut:
    period_a = (await db.execute(select(BioacousticMonitoringPeriod).where(BioacousticMonitoringPeriod.id == period_a_id))).scalar_one_or_none()
    period_b = (await db.execute(select(BioacousticMonitoringPeriod).where(BioacousticMonitoringPeriod.id == period_b_id))).scalar_one_or_none()
    if period_a is None or period_b is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    fence = (
        await db.execute(
            apply_owner_org_scope(
                select(PlantationFence).where(PlantationFence.id == period_a.fence_id),
                user,
                owner_col=PlantationFence.owner_user_id,
                org_col=PlantationFence.organization_id,
            )
        )
    ).scalar_one_or_none()
    if fence is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    try:
        data = await compare_monitoring_periods(db, period_a, period_b)
        return PeriodComparisonOut(**data)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/fences/{fence_id}/audit-bundle", response_model=AuditBundleOut)
async def fence_audit_bundle(
    fence_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> AuditBundleOut:
    fence = (
        await db.execute(
            apply_owner_org_scope(
                select(PlantationFence).where(PlantationFence.id == fence_id),
                user,
                owner_col=PlantationFence.owner_user_id,
                org_col=PlantationFence.organization_id,
            )
        )
    ).scalar_one_or_none()
    if fence is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="fence_not_found")
    recordings = list(
        (
            await db.execute(
                _scope(select(BioacousticRecording), user).where(
                    BioacousticRecording.plantation_fence_id == fence_id
                )
            )
        ).scalars().all()
    )
    bundle = await build_audit_bundle(db, fence, recordings)
    return AuditBundleOut(**bundle)


@router.post("/projects/{project_id}/monitoring-plans/ensure", response_model=list[MonitoringPlanOut])
async def ensure_project_monitoring_plans(
    project_id: uuid.UUID,
    user: WriteProfessional,
    db: DB,
) -> list[MonitoringPlanOut]:
    await assert_org_feature_enabled(db, user, "bioacoustic")
    project = (
        await db.execute(
            apply_owner_org_scope(
                select(PlantingProject).where(PlantingProject.id == project_id),
                user,
                owner_col=PlantingProject.owner_user_id,
                org_col=PlantingProject.organization_id,
            )
        )
    ).scalar_one_or_none()
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    await ensure_monitoring_plans_for_project(db, project)
    await db.commit()
    plans = await list_monitoring_plans(db, project_id)
    return [MonitoringPlanOut(**p) for p in plans]


@router.get("/projects/{project_id}/monitoring-plans", response_model=list[MonitoringPlanOut])
async def get_project_monitoring_plans(
    project_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> list[MonitoringPlanOut]:
    project = (
        await db.execute(
            apply_owner_org_scope(
                select(PlantingProject).where(PlantingProject.id == project_id),
                user,
                owner_col=PlantingProject.owner_user_id,
                org_col=PlantingProject.organization_id,
            )
        )
    ).scalar_one_or_none()
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    plans = await list_monitoring_plans(db, project_id)
    return [MonitoringPlanOut(**p) for p in plans]


@router.get("/fences/{fence_id}/baseline-delta", response_model=BaselineDeltaOut)
async def fence_baseline_delta(
    fence_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> BaselineDeltaOut:
    fence = (
        await db.execute(
            apply_owner_org_scope(
                select(PlantationFence).where(PlantationFence.id == fence_id),
                user,
                owner_col=PlantationFence.owner_user_id,
                org_col=PlantationFence.organization_id,
            )
        )
    ).scalar_one_or_none()
    if fence is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="fence_not_found")
    data = await compute_baseline_delta(db, fence_id)
    return BaselineDeltaOut(**data)


@router.get("/fences/{fence_id}/trends", response_model=FenceTrendsOut)
async def fence_biodiversity_trends(
    fence_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
) -> FenceTrendsOut:
    fence = (
        await db.execute(
            apply_owner_org_scope(
                select(PlantationFence).where(PlantationFence.id == fence_id),
                user,
                owner_col=PlantationFence.owner_user_id,
                org_col=PlantationFence.organization_id,
            )
        )
    ).scalar_one_or_none()
    if fence is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="fence_not_found")
    data = await compute_fence_trends(db, fence_id)
    return FenceTrendsOut(**data)


@router.post(
    "/recordings/{recording_id}/compliance-evidence",
    response_model=ComplianceEvidenceOut,
    status_code=status.HTTP_201_CREATED,
)
async def link_compliance_evidence(
    recording_id: uuid.UUID,
    payload: ComplianceEvidenceCreate,
    user: WriteProfessional,
    db: DB,
) -> ComplianceEvidenceOut:
    await assert_org_feature_enabled(db, user, "bioacoustic")
    rec = (
        await db.execute(
            _scope(select(BioacousticRecording).where(BioacousticRecording.id == recording_id), user)
        )
    ).scalar_one_or_none()
    if rec is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    try:
        row = await link_recording_to_checklist(
            db,
            recording=rec,
            project_id=payload.project_id,
            checklist_code=payload.checklist_code,
            checklist_item_id=payload.checklist_item_id,
            linked_by_user_id=user.id,
            notes=payload.notes,
        )
        await db.commit()
        items = await list_project_bioacoustic_evidence(db, payload.project_id, payload.checklist_code)
        match = next((i for i in items if i["id"] == str(row.id)), None)
        if match is None:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="link_failed")
        return ComplianceEvidenceOut(**match)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/projects/{project_id}/compliance-evidence", response_model=list[ComplianceEvidenceOut])
async def project_compliance_evidence(
    project_id: uuid.UUID,
    user: CurrentUser,
    db: DB,
    checklist_code: str | None = None,
) -> list[ComplianceEvidenceOut]:
    project = (
        await db.execute(
            apply_owner_org_scope(
                select(PlantingProject).where(PlantingProject.id == project_id),
                user,
                owner_col=PlantingProject.owner_user_id,
                org_col=PlantingProject.organization_id,
            )
        )
    ).scalar_one_or_none()
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
    items = await list_project_bioacoustic_evidence(db, project_id, checklist_code)
    return [ComplianceEvidenceOut(**i) for i in items]
