"""Bioacoustic recording and biodiversity analysis endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select

from app.api.v1.deps import DB, CurrentUser
from app.models.bioacoustic_recording import BioacousticRecording
from app.schemas.bioacoustic import (
    BioacousticAnalyzeResponse,
    BioacousticRecordingCreate,
    BioacousticRecordingOut,
    BioacousticSummary,
    RegionalFaunaOut,
)
from app.services.bioacoustic.ops import create_recording, enqueue_bioacoustic_analysis
from app.services.bioacoustic.regional_fauna import build_regional_fauna
from app.services.storage import get_storage

router = APIRouter(prefix="/bioacoustic", tags=["bioacoustic"])

_THREATENED = {"Critically Endangered", "Endangered", "Vulnerable"}


def _scope(stmt, user):
    if user.role == "admin":
        return stmt
    if user.organization_id:
        return stmt.where(
            (BioacousticRecording.owner_user_id == user.id)
            | (BioacousticRecording.organization_id == user.organization_id)
        )
    return stmt.where(BioacousticRecording.owner_user_id == user.id)


@router.post("/recordings", response_model=BioacousticRecordingOut, status_code=status.HTTP_201_CREATED)
async def register_recording(
    payload: BioacousticRecordingCreate, user: CurrentUser, db: DB
) -> BioacousticRecordingOut:
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
            metadata=payload.metadata,
        )
    except ValueError as exc:
        code = str(exc)
        if code == "fence_not_found":
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=code) from exc
        if code == "forbidden":
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=code) from exc
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=code) from exc


@router.post("/recordings/upload", response_model=BioacousticRecordingOut, status_code=status.HTTP_201_CREATED)
async def upload_recording(
    user: CurrentUser,
    db: DB,
    file: UploadFile = File(...),
    duration_seconds: float = Form(45.0),
    latitude: float = Form(0.0),
    longitude: float = Form(0.0),
    plantation_fence_id: uuid.UUID | None = Form(None),
) -> BioacousticRecordingOut:
    """Direct multipart upload (mobile + web)."""
    data = await file.read()
    if len(data) < 1000:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="audio_too_short")
    if duration_seconds < 60:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="duration_below_minimum_60s")
    ext = ".wav" if (file.filename or "").lower().endswith(".wav") else ".m4a"
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
            metadata={"filename": file.filename or "recording.webm"},
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="recording_create_failed",
        ) from exc


@router.get("/recordings", response_model=list[BioacousticRecordingOut])
async def list_recordings(user: CurrentUser, db: DB, limit: int = 50) -> list[BioacousticRecordingOut]:
    stmt = (
        _scope(select(BioacousticRecording), user)
        .order_by(BioacousticRecording.recorded_at.desc())
        .limit(min(limit, 100))
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [BioacousticRecordingOut.from_model(r) for r in rows]


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
    user: CurrentUser,
    db: DB,
    force: bool = False,
) -> BioacousticAnalyzeResponse:
    """Queue BirdNET analysis on the Celery worker (poll GET /recordings/{id})."""
    try:
        return await enqueue_bioacoustic_analysis(db, recording_id, user, force=force)
    except ValueError as exc:
        code = str(exc)
        if code == "not_found":
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=code) from exc
        if code == "forbidden":
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=code) from exc
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=code) from exc


@router.get("/regional-fauna", response_model=RegionalFaunaOut)
async def regional_fauna(
    user: CurrentUser,
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(25.0, ge=1, le=100),
    taxon_group: str | None = Query(None, description="bird, frog, mammal, insect"),
) -> RegionalFaunaOut:
    """
    GBIF + IUCN regional species checklist for a GPS point.
    Use before recording to see expected fauna, or to validate detections.
    """
    groups = {taxon_group} if taxon_group else None
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
    threatened = 0
    taxon_calls: dict[str, int] = {}
    if analyzed_rows:
        health_scores = [float(r.bioacoustic_health_score or 0) for r in analyzed_rows]
        shannon_scores = [float(r.shannon_diversity_index or 0) for r in analyzed_rows]
        simpson_scores = [float(r.simpson_diversity_index or 0) for r in analyzed_rows]
        avg_health = round(sum(health_scores) / len(health_scores), 2)
        avg_shannon = round(sum(shannon_scores) / len(shannon_scores), 4)
        avg_simpson = round(sum(simpson_scores) / len(simpson_scores), 4)
        for r in analyzed_rows:
            for det in r.species_detections or []:
                species_set.add(det.get("scientific_name", ""))
                if det.get("iucn_status") in _THREATENED:
                    threatened += 1
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
        avg_health_score=avg_health,
        avg_shannon_index=avg_shannon,
        avg_simpson_index=avg_simpson,
        total_species_detected=len(species_set),
        threatened_species_count=threatened,
        taxon_breakdown=taxon_calls,
        recent_recordings=[BioacousticRecordingOut.from_model(r) for r in recent],
    )
