"""Audit reproducibility bundle with manifests, hashes, and reviewer log."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bioacoustic_analysis_run import BioacousticAnalysisRun
from app.models.bioacoustic_recording import BioacousticRecording
from app.models.plantation_fence import PlantationFence
from app.services.bioacoustic.confidence import METHODOLOGY_VERSION
from app.services.bioacoustic.methodology import recording_export_blockers
from app.services.bioacoustic.review import apply_reviews_to_detections


def _canonical_json(data: Any) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), default=str)


def _sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


async def build_audit_bundle(
    db: AsyncSession,
    fence: PlantationFence,
    recordings: list[BioacousticRecording],
) -> dict[str, Any]:
    run_ids = [r.latest_analysis_run_id for r in recordings if r.latest_analysis_run_id]
    runs_by_rec: dict[uuid.UUID, list[BioacousticAnalysisRun]] = {}
    if run_ids:
        runs = (
            await db.execute(
                select(BioacousticAnalysisRun).where(BioacousticAnalysisRun.recording_id.in_([r.id for r in recordings]))
            )
        ).scalars().all()
        for run in runs:
            runs_by_rec.setdefault(run.recording_id, []).append(run)

    reviewer_log: list[dict[str, Any]] = []
    recording_manifests: list[dict[str, Any]] = []

    for rec in recordings:
        reviews = list(rec.detection_reviews or [])
        for review in reviews:
            reviewer_log.append(
                {
                    "recording_id": str(rec.id),
                    "scientific_name": review.scientific_name,
                    "decision": review.decision,
                    "reviewer_user_id": str(review.reviewer_user_id),
                    "reviewed_at": review.reviewed_at.isoformat(),
                    "analysis_run_id": str(review.analysis_run_id) if review.analysis_run_id else None,
                    "notes": review.notes,
                }
            )

        detections = apply_reviews_to_detections(
            list(rec.species_detections or []),
            reviews,
            analysis_run_id=rec.latest_analysis_run_id,
        )
        rec_runs = runs_by_rec.get(rec.id, [])
        latest_run = next((r for r in rec_runs if r.id == rec.latest_analysis_run_id), None)
        manifest = {
            "recording_id": str(rec.id),
            "recorded_at": rec.recorded_at.isoformat() if rec.recorded_at else None,
            "status": rec.status,
            "s3_key": rec.s3_key,
            "audio_sha256": latest_run.audio_sha256 if latest_run else None,
            "latest_analysis_run_id": str(rec.latest_analysis_run_id) if rec.latest_analysis_run_id else None,
            "methodology_version": METHODOLOGY_VERSION,
            "pipeline": latest_run.pipeline if latest_run else None,
            "config_hash": latest_run.config_hash if latest_run else None,
            "export_blockers": recording_export_blockers(rec, reviews=reviews),
            "detections": detections,
            "analysis_runs": [
                {
                    "id": str(run.id),
                    "run_number": run.run_number,
                    "audio_sha256": run.audio_sha256,
                    "config_hash": run.config_hash,
                    "pipeline": run.pipeline,
                    "analyzed_at": run.analyzed_at.isoformat() if run.analyzed_at else None,
                }
                for run in sorted(rec_runs, key=lambda r: r.run_number)
            ],
        }
        manifest["manifest_hash"] = _sha256_text(_canonical_json(manifest))
        recording_manifests.append(manifest)

    bundle_body = {
        "bundle_type": "bioacoustic_audit_reproducibility",
        "generated_at": datetime.now(UTC).isoformat(),
        "methodology_version": METHODOLOGY_VERSION,
        "fence_id": str(fence.id),
        "fence_name": fence.name,
        "recording_count": len(recordings),
        "recordings": recording_manifests,
        "reviewer_log": sorted(reviewer_log, key=lambda r: r.get("reviewed_at") or ""),
    }
    bundle_body["bundle_hash"] = _sha256_text(_canonical_json(bundle_body))
    return bundle_body
