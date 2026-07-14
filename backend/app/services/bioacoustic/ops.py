"""Persist and analyze bioacoustic recordings."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bioacoustic_recording import BioacousticRecording
from app.models.plantation_fence import PlantationFence
from app.models.user import User
from app.schemas.bioacoustic import BioacousticRecordingOut
from app.services.ai.bioacoustic import identify_species_from_audio
from app.services.bioacoustic.iucn_catalog import enrich_detection
from app.services.bioacoustic.metrics import aggregate_metrics
from app.services.bioacoustic.preprocess import preprocess_audio
from app.services.storage import get_storage


def _point_wkt(lon: float, lat: float) -> str:
    return f"POINT({lon} {lat})"


async def _load_owned_recording(
    recording_id: uuid.UUID, user: User, db: AsyncSession
) -> BioacousticRecording:
    res = await db.execute(
        select(BioacousticRecording).where(BioacousticRecording.id == recording_id)
    )
    rec = res.scalar_one_or_none()
    if rec is None:
        raise ValueError("not_found")
    if user.role != "admin":
        if user.organization_id and rec.organization_id == user.organization_id:
            return rec
        if rec.owner_user_id != user.id:
            raise ValueError("forbidden")
    return rec


async def analyze_bioacoustic_recording(
    db: AsyncSession, recording_id: uuid.UUID, user: User
) -> BioacousticRecordingOut:
    rec = await _load_owned_recording(recording_id, user, db)
    storage = get_storage()
    audio_bytes = storage.get_bytes(rec.s3_key) or b""
    if not audio_bytes:
        # Dev stub: synthesize bytes from recording id for deterministic output.
        audio_bytes = rec.s3_key.encode("utf-8")

    lat = lon = None
    if rec.location is not None:
        from geoalchemy2.shape import to_shape

        pt = to_shape(rec.location)
        lon, lat = float(pt.x), float(pt.y)

    preprocessing = preprocess_audio(audio_bytes, s3_key=rec.s3_key)
    ai = identify_species_from_audio(
        audio_bytes,
        duration_seconds=float(rec.duration_seconds),
        latitude=lat,
        longitude=lon,
    )

    enriched: list[dict] = []
    for det in ai.detections:
        row = enrich_detection(det.scientific_name, det.common_name, det.taxon_group)
        row["confidence"] = det.confidence
        row["call_count"] = det.call_count
        enriched.append(row)

    metrics = aggregate_metrics(enriched)
    rec.status = "analyzed"
    rec.preprocessing = preprocessing
    rec.spectrogram_s3_key = preprocessing.get("spectrogram_s3_key")
    rec.species_detections = enriched
    rec.total_species_count = metrics["total_species_count"]
    rec.total_calls_detected = metrics["total_calls_detected"]
    rec.shannon_diversity_index = metrics["shannon_diversity_index"]
    rec.bioacoustic_health_score = metrics["bioacoustic_health_score"]
    rec.ai_confidence_score = metrics["ai_confidence_score"]
    rec.analysis_summary = ai.summary
    rec.raw_output = {
        "pipeline": ai.pipeline,
        "detections": enriched,
        "metrics": metrics,
    }
    rec.analyzed_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(rec)
    return BioacousticRecordingOut.from_model(rec)


async def create_recording(
    db: AsyncSession,
    user: User,
    *,
    s3_key: str,
    duration_seconds: float,
    latitude: float,
    longitude: float,
    plantation_fence_id: uuid.UUID | None = None,
    recorded_at: datetime | None = None,
    metadata: dict | None = None,
) -> BioacousticRecordingOut:
    if plantation_fence_id is not None:
        fence_res = await db.execute(
            select(PlantationFence).where(PlantationFence.id == plantation_fence_id)
        )
        fence = fence_res.scalar_one_or_none()
        if fence is None:
            raise ValueError("fence_not_found")
        if user.role != "admin" and fence.owner_user_id != user.id:
            if not (
                user.organization_id and fence.organization_id == user.organization_id
            ):
                raise ValueError("forbidden")

    rec = BioacousticRecording(
        owner_user_id=user.id,
        organization_id=user.organization_id,
        plantation_fence_id=plantation_fence_id,
        s3_key=s3_key,
        duration_seconds=duration_seconds,
        recorded_at=recorded_at or datetime.now(UTC),
        location=_point_wkt(longitude, latitude),
        status="uploaded",
        metadata_=metadata or {},
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return BioacousticRecordingOut.from_model(rec)
