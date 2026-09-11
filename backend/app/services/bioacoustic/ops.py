"""Persist and analyze bioacoustic recordings."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.bioacoustic_recording import BioacousticRecording
from app.models.plantation_fence import PlantationFence
from app.models.user import User
from app.schemas.bioacoustic import BioacousticAnalyzeResponse, BioacousticRecordingOut
from app.services.ai.bioacoustic import identify_species_from_audio
from app.services.bioacoustic.acoustics import measure_spl_from_wav
from app.services.bioacoustic.analysis_versioning import persist_analysis_run_sync
from app.services.bioacoustic.birdnet_runner import cleanup_wav
from app.services.bioacoustic.confidence import METHODOLOGY_VERSION
from app.services.bioacoustic.detection_tiers import apply_detection_tiers
from app.services.bioacoustic.ecoacoustic_indices import compute_ecoacoustic_indices
from app.services.bioacoustic.enrichment import enrich_detection
from app.services.bioacoustic.identification_coverage import identification_coverage
from app.services.bioacoustic.merge_detections import taxon_breakdown
from app.services.bioacoustic.metrics import aggregate_assessment_metrics
from app.services.bioacoustic.preprocess import preprocess_audio
from app.services.bioacoustic.regional_fauna import annotate_regional_match, build_regional_fauna
from app.services.bioacoustic.spectrogram import upload_spectrogram
from app.services.storage import get_storage
from app.services.storage.key_ownership import assert_owned_upload_key


def _point_wkt(lon: float, lat: float) -> str:
    return f"POINT({lon} {lat})"


_KNOWN_GPS_FALLBACKS = ((17.385, 78.4867), (0.0, 0.0))


def _resolve_gps_flags(
    latitude: float,
    longitude: float,
    *,
    gps_verified: bool | None = None,
    gps_fallback: bool | None = None,
    gps_accuracy_m: float | None = None,
) -> tuple[bool, bool]:
    if gps_fallback:
        return False, True
    is_fallback = any(
        abs(latitude - lat) < 0.01 and abs(longitude - lon) < 0.01
        for lat, lon in _KNOWN_GPS_FALLBACKS
    )
    if is_fallback:
        return False, True
    if gps_verified is not None:
        return gps_verified, False
    verified = gps_accuracy_m is not None and gps_accuracy_m <= 150.0
    return verified, False


def _coords_from_recording(rec: BioacousticRecording) -> tuple[float | None, float | None]:
    if rec.location is None:
        return None, None
    from geoalchemy2.shape import to_shape

    pt = to_shape(rec.location)
    return float(pt.y), float(pt.x)


def _run_analysis_pipeline(db: Session, rec: BioacousticRecording, audio_bytes: bytes) -> None:
    lat, lon = _coords_from_recording(rec)
    preprocessing = preprocess_audio(audio_bytes, s3_key=rec.s3_key)
    wav_path = preprocessing.get("wav_temp_path")
    storage = get_storage()

    spl_metrics: dict = {}
    ecoacoustic: dict = {}
    if wav_path:
        spl_metrics = measure_spl_from_wav(wav_path)
        ecoacoustic = compute_ecoacoustic_indices(wav_path)
        spec_key = preprocessing.get("spectrogram_s3_key")
        if spec_key:
            uploaded = upload_spectrogram(storage, spec_key, wav_path)
            preprocessing["spectrogram_generated"] = bool(uploaded)

    try:
        ai = identify_species_from_audio(
            audio_bytes,
            duration_seconds=float(rec.duration_seconds),
            latitude=lat,
            longitude=lon,
            preprocessing=preprocessing,
            recorded_at=rec.recorded_at,
        )

        enriched: list[dict] = []
        for det in ai.detections:
            row = enrich_detection(
                det.scientific_name,
                det.common_name,
                det.taxon_group,
                confidence=det.confidence,
                call_count=det.call_count,
                time_intervals=getattr(det, "time_intervals", None),
            )
            row["pipeline_source"] = ai.pipeline
            enriched.append(row)

        enriched = annotate_regional_match(enriched, lat, lon)
        enriched = apply_detection_tiers(enriched)

        regional_context = None
        if lat is not None and lon is not None:
            try:
                regional_context = build_regional_fauna(lat, lon, limit=30)
            except Exception:
                regional_context = None

        warning_high_noise = bool(spl_metrics.get("warning_high_noise"))
        metrics = aggregate_assessment_metrics(
            enriched,
            ecoacoustic=ecoacoustic,
            duration_seconds=float(rec.duration_seconds),
            gps_verified=bool(rec.gps_verified),
            gps_fallback=bool(rec.gps_fallback),
            warning_high_noise=warning_high_noise,
        )
        from app.services.ai.bioacoustic_types import SpeciesDetection

        taxon_rows = [
            SpeciesDetection(
                scientific_name=d["scientific_name"],
                common_name=d["common_name"],
                taxon_group=d["taxon_group"],
                confidence=float(d["confidence"]),
                call_count=int(d["call_count"]),
            )
            for d in enriched
        ]
        rec.status = "analyzed"
        rec.preprocessing = {
            **{k: v for k, v in preprocessing.items() if k != "wav_temp_path"},
            "spl_metrics": spl_metrics,
            "ecoacoustic_indices": ecoacoustic,
            "analysis_pipeline": ai.pipeline,
        }
        rec.spectrogram_s3_key = preprocessing.get("spectrogram_s3_key")
        audio_sha256 = preprocessing.get("audio_sha256")
        raw_output = {
            "engine": "biodiversity_assessment_v2",
            "pipeline": ai.pipeline,
            "methodology_version": METHODOLOGY_VERSION,
            "identification_coverage": identification_coverage(),
            "detections": enriched,
            "metrics": metrics,
            "spl_metrics": spl_metrics,
            "ecoacoustic_indices": ecoacoustic,
            "taxon_breakdown": taxon_breakdown(taxon_rows),
            "regional_fauna": regional_context,
            "gps": {
                "verified": rec.gps_verified,
                "fallback": rec.gps_fallback,
                "accuracy_m": float(rec.gps_accuracy_m) if rec.gps_accuracy_m else None,
                "source": rec.gps_source,
            },
            "data_sources": {
                "identification": ai.pipeline,
                "taxonomy": "gbif",
                "conservation": "iucn_api"
                if regional_context and regional_context.get("iucn_live")
                else "iucn_catalog",
                "ecoacoustic": "librosa",
            },
            "limitations": [
                "Acoustic detections indicate vocal activity, not confirmed individual animals.",
                "Accepted-tier species only contribute to diversity indices.",
                "Biodiversity Confidence is an evidence score, not ecological health.",
            ],
        }

        run = persist_analysis_run_sync(
            db,
            rec,
            pipeline=ai.pipeline,
            audio_sha256=audio_sha256,
            species_detections=enriched,
            metrics=metrics,
            raw_output=raw_output,
            celery_task_id=rec.celery_task_id,
        )

        rec.status = "analyzed"
        rec.preprocessing = {
            **{k: v for k, v in preprocessing.items() if k != "wav_temp_path"},
            "spl_metrics": spl_metrics,
            "ecoacoustic_indices": ecoacoustic,
            "analysis_pipeline": ai.pipeline,
            "methodology_version": METHODOLOGY_VERSION,
            "latest_analysis_run_id": str(run.id),
            "analysis_run_number": run.run_number,
        }
        rec.spectrogram_s3_key = preprocessing.get("spectrogram_s3_key")
        rec.species_detections = enriched
        rec.accepted_species_count = metrics["accepted_species_count"]
        rec.acoustic_signals_count = metrics["acoustic_signals_count"]
        rec.total_species_count = metrics["accepted_species_count"]
        rec.total_calls_detected = metrics["total_calls_detected"]
        rec.shannon_diversity_index = metrics["shannon_diversity_index"]
        rec.simpson_diversity_index = metrics["simpson_diversity_index"]
        rec.biodiversity_confidence_score = metrics["biodiversity_confidence_score"]
        rec.bioacoustic_health_score = metrics["biodiversity_confidence_score"]
        rec.ai_confidence_score = metrics["ai_confidence_score"]
        rec.analysis_summary = ai.summary
        rec.analysis_error = None
        rec.raw_output = raw_output
        rec.analyzed_at = datetime.now(UTC)
    finally:
        cleanup_wav(preprocessing)


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


def _load_recording_sync(recording_id: uuid.UUID, db: Session) -> BioacousticRecording:
    rec = db.get(BioacousticRecording, recording_id)
    if rec is None:
        raise ValueError("not_found")
    return rec


def analyze_bioacoustic_recording_sync(recording_id: uuid.UUID) -> dict:
    """Celery worker entry: run full analysis synchronously."""
    from app.core.database_sync import get_sync_db

    with get_sync_db() as db:
        rec = _load_recording_sync(recording_id, db)
        if rec.status == "analyzed":
            return {"recording_id": str(recording_id), "status": "analyzed"}
        rec.status = "analyzing"
        rec.analysis_error = None
        db.commit()

        storage = get_storage()
        audio_bytes = storage.get_bytes(rec.s3_key) or b""
        if not audio_bytes:
            raise ValueError("audio_missing")

        try:
            _run_analysis_pipeline(db, rec, audio_bytes)
            db.commit()
            return {"recording_id": str(recording_id), "status": "analyzed"}
        except Exception as exc:
            rec.status = "failed"
            rec.analysis_error = str(exc)[:2000]
            db.commit()
            return {"recording_id": str(recording_id), "status": "failed", "error": str(exc)}


async def enqueue_bioacoustic_analysis(
    db: AsyncSession, recording_id: uuid.UUID, user: User, *, force: bool = False
) -> BioacousticAnalyzeResponse:
    rec = await _load_owned_recording(recording_id, user, db)
    if rec.status in {"queued", "analyzing"}:
        return BioacousticAnalyzeResponse(
            recording_id=rec.id,
            status=rec.status,
            celery_task_id=rec.celery_task_id,
        )
    if rec.status == "analyzed" and not force:
        return BioacousticAnalyzeResponse(
            recording_id=rec.id,
            status="analyzed",
            celery_task_id=rec.celery_task_id,
        )

    from app.workers.tasks import run_bioacoustic_analysis

    rec.status = "queued"
    rec.analysis_error = None
    await db.commit()

    try:
        task = run_bioacoustic_analysis.delay(str(recording_id))
        rec.celery_task_id = task.id
        await db.commit()
        await db.refresh(rec)
        return BioacousticAnalyzeResponse(
            recording_id=rec.id,
            status=rec.status,
            celery_task_id=task.id,
        )
    except Exception:
        result = analyze_bioacoustic_recording_sync(recording_id)
        await db.refresh(rec)
        return BioacousticAnalyzeResponse(
            recording_id=rec.id,
            status=result.get("status", rec.status),
            celery_task_id=None,
        )


async def analyze_bioacoustic_recording(
    db: AsyncSession, recording_id: uuid.UUID, user: User
) -> BioacousticRecordingOut:
    """Synchronous analyze (dev/tests). Production clients should use enqueue."""
    rec = await _load_owned_recording(recording_id, user, db)
    storage = get_storage()
    audio_bytes = storage.get_bytes(rec.s3_key) or b""
    if not audio_bytes:
        raise ValueError("audio_missing")

    rec.status = "analyzing"
    await db.commit()
    try:
        from app.core.database_sync import get_sync_db

        with get_sync_db() as sync_db:
            sync_rec = sync_db.get(BioacousticRecording, recording_id)
            if sync_rec is None:
                raise ValueError("not_found")
            _run_analysis_pipeline(sync_db, sync_rec, audio_bytes)
            sync_db.commit()
        await db.refresh(rec)
    except Exception as exc:
        rec.status = "failed"
        rec.analysis_error = str(exc)[:2000]
        await db.commit()
        await db.refresh(rec)
        raise ValueError("analysis_failed") from exc

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
    recording_started_at: datetime | None = None,
    recording_ended_at: datetime | None = None,
    gps_accuracy_m: float | None = None,
    gps_source: str | None = None,
    gps_verified: bool | None = None,
    gps_fallback: bool | None = None,
    metadata: dict | None = None,
) -> BioacousticRecordingOut:
    assert_owned_upload_key(user.id, s3_key, folders=("bioacoustic",))

    if plantation_fence_id is not None:
        fence_res = await db.execute(
            select(PlantationFence).where(PlantationFence.id == plantation_fence_id)
        )
        fence = fence_res.scalar_one_or_none()
        if fence is None:
            raise ValueError("fence_not_found")
        if user.role != "admin" and fence.owner_user_id != user.id and not (
            user.organization_id and fence.organization_id == user.organization_id
        ):
            raise ValueError("forbidden")

    verified, fallback = _resolve_gps_flags(
        latitude,
        longitude,
        gps_verified=gps_verified,
        gps_fallback=gps_fallback,
        gps_accuracy_m=gps_accuracy_m,
    )
    capture_start = recording_started_at or recorded_at
    rec = BioacousticRecording(
        owner_user_id=user.id,
        organization_id=user.organization_id,
        plantation_fence_id=plantation_fence_id,
        s3_key=s3_key,
        duration_seconds=duration_seconds,
        recorded_at=recorded_at or capture_start or datetime.now(UTC),
        recording_started_at=capture_start,
        recording_ended_at=recording_ended_at,
        location=_point_wkt(longitude, latitude),
        gps_accuracy_m=gps_accuracy_m,
        gps_source=gps_source,
        gps_verified=verified,
        gps_fallback=fallback,
        status="uploaded",
        metadata_=metadata or {},
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return BioacousticRecordingOut.from_model(rec)
