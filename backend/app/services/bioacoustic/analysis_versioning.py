"""Helpers for immutable bioacoustic analysis runs."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.bioacoustic_analysis_run import BioacousticAnalysisRun
from app.models.bioacoustic_recording import BioacousticRecording
from app.services.bioacoustic.confidence import METHODOLOGY_VERSION


def pipeline_config_hash() -> str:
    payload = {
        "pipeline": settings.bioacoustic_pipeline,
        "min_confidence": settings.bioacoustic_min_confidence,
        "review_confidence": settings.bioacoustic_review_confidence,
        "return_all_detections": settings.bioacoustic_return_all_detections,
        "noise_reduction": settings.bioacoustic_noise_reduction,
        "enable_perch": settings.bioacoustic_enable_perch,
        "methodology_version": METHODOLOGY_VERSION,
    }
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    return digest[:16]


def resolve_model_version(pipeline: str) -> str:
    versions: list[str] = [pipeline]
    if "birdnet" in pipeline or pipeline == "birdnet-analyzer-v1":
        try:
            import importlib.metadata

            versions.append(f"birdnetlib={importlib.metadata.version('birdnetlib')}")
        except Exception:
            versions.append("birdnetlib=unknown")
    return ";".join(versions)


def _next_run_number_sync(db: Session, recording_id: uuid.UUID) -> int:
    current = db.scalar(
        select(func.max(BioacousticAnalysisRun.run_number)).where(
            BioacousticAnalysisRun.recording_id == recording_id
        )
    )
    return int(current or 0) + 1


async def _next_run_number_async(db: AsyncSession, recording_id: uuid.UUID) -> int:
    current = (
        await db.execute(
            select(func.max(BioacousticAnalysisRun.run_number)).where(
                BioacousticAnalysisRun.recording_id == recording_id
            )
        )
    ).scalar()
    return int(current or 0) + 1


def persist_analysis_run_sync(
    db: Session,
    rec: BioacousticRecording,
    *,
    pipeline: str,
    audio_sha256: str | None,
    species_detections: list[dict[str, Any]],
    metrics: dict[str, Any],
    raw_output: dict[str, Any],
    celery_task_id: str | None = None,
    analysis_error: str | None = None,
    status: str = "completed",
) -> BioacousticAnalysisRun:
    run_number = _next_run_number_sync(db, rec.id)
    supersedes_id = rec.latest_analysis_run_id

    run = BioacousticAnalysisRun(
        recording_id=rec.id,
        run_number=run_number,
        supersedes_run_id=supersedes_id,
        status=status,
        pipeline=pipeline,
        model_version=resolve_model_version(pipeline),
        config_hash=pipeline_config_hash(),
        audio_sha256=audio_sha256,
        methodology_version=METHODOLOGY_VERSION,
        species_detections=species_detections,
        metrics=metrics,
        raw_output=raw_output,
        analysis_error=analysis_error,
        celery_task_id=celery_task_id,
        analyzed_at=datetime.now(UTC) if status == "completed" else None,
        accepted_species_count=metrics.get("accepted_species_count"),
        acoustic_signals_count=metrics.get("acoustic_signals_count"),
        biodiversity_confidence_score=metrics.get("biodiversity_confidence_score"),
        shannon_diversity_index=metrics.get("shannon_diversity_index"),
        simpson_diversity_index=metrics.get("simpson_diversity_index"),
    )
    db.add(run)
    db.flush()
    rec.latest_analysis_run_id = run.id
    return run
