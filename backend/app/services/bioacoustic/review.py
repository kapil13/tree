"""Expert review workflow for bioacoustic species detections."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bioacoustic_detection_review import BioacousticDetectionReview
from app.models.bioacoustic_recording import BioacousticRecording
from app.services.bioacoustic.detection_tiers import (
    TIER_ACCEPTED,
    TIER_PROBABLE,
    TIER_REVIEW_REQUIRED,
)

DECISION_CONFIRMED = "confirmed"
DECISION_REJECTED = "rejected"
DECISION_INDETERMINATE = "indeterminate"
VALID_DECISIONS = frozenset({DECISION_CONFIRMED, DECISION_REJECTED, DECISION_INDETERMINATE})


def review_key(scientific_name: str, analysis_run_id: uuid.UUID | None) -> tuple[str, str | None]:
    return scientific_name, str(analysis_run_id) if analysis_run_id else None


def reviews_index(reviews: list[BioacousticDetectionReview]) -> dict[tuple[str, str | None], BioacousticDetectionReview]:
    out: dict[tuple[str, str | None], BioacousticDetectionReview] = {}
    for row in reviews:
        out[review_key(row.scientific_name, row.analysis_run_id)] = row
    return out


def effective_detection_tier(
    det: dict[str, Any],
    reviews: dict[tuple[str, str | None], BioacousticDetectionReview],
    *,
    analysis_run_id: uuid.UUID | None = None,
) -> str:
    name = det.get("scientific_name", "")
    key = review_key(name, analysis_run_id)
    review = reviews.get(key)
    if review is None:
        return det.get("detection_tier") or TIER_REVIEW_REQUIRED
    if review.decision == DECISION_CONFIRMED:
        return TIER_ACCEPTED
    if review.decision == DECISION_REJECTED:
        return TIER_REVIEW_REQUIRED
    return TIER_PROBABLE


def detection_needs_review(
    det: dict[str, Any],
    reviews: dict[tuple[str, str | None], BioacousticDetectionReview],
    *,
    analysis_run_id: uuid.UUID | None = None,
) -> bool:
    name = det.get("scientific_name", "")
    key = review_key(name, analysis_run_id)
    review = reviews.get(key)
    if review and review.decision in {DECISION_CONFIRMED, DECISION_REJECTED}:
        return False
    tier = det.get("detection_tier") or TIER_REVIEW_REQUIRED
    return tier == TIER_REVIEW_REQUIRED or bool(det.get("needs_review"))


def apply_reviews_to_detections(
    detections: list[dict[str, Any]],
    reviews: list[BioacousticDetectionReview],
    *,
    analysis_run_id: uuid.UUID | None = None,
) -> list[dict[str, Any]]:
    idx = reviews_index(reviews)
    out: list[dict[str, Any]] = []
    for det in detections:
        row = dict(det)
        tier = effective_detection_tier(row, idx, analysis_run_id=analysis_run_id)
        row["detection_tier"] = tier
        row["needs_review"] = detection_needs_review(row, idx, analysis_run_id=analysis_run_id)
        row["included_in_richness"] = tier == TIER_ACCEPTED
        key = review_key(row.get("scientific_name", ""), analysis_run_id)
        review = idx.get(key)
        if review:
            row["human_review"] = {
                "decision": review.decision,
                "reviewer_user_id": str(review.reviewer_user_id),
                "reviewed_at": review.reviewed_at.isoformat(),
                "notes": review.notes,
            }
        out.append(row)
    return out


async def list_review_queue(
    db: AsyncSession,
    recordings: list[BioacousticRecording],
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for rec in recordings:
        if rec.status != "analyzed":
            continue
        reviews = list(rec.detection_reviews or [])
        idx = reviews_index(reviews)
        run_id = rec.latest_analysis_run_id
        for det in rec.species_detections or []:
            if not detection_needs_review(det, idx, analysis_run_id=run_id):
                continue
            items.append(
                {
                    "recording_id": str(rec.id),
                    "analysis_run_id": str(run_id) if run_id else None,
                    "recorded_at": rec.recorded_at.isoformat() if rec.recorded_at else None,
                    "plantation_fence_id": str(rec.plantation_fence_id) if rec.plantation_fence_id else None,
                    "scientific_name": det.get("scientific_name"),
                    "common_name": det.get("common_name"),
                    "taxon_group": det.get("taxon_group"),
                    "confidence": det.get("confidence"),
                    "detection_tier": det.get("detection_tier"),
                    "iucn_status": det.get("iucn_status"),
                    "needs_review": True,
                }
            )
    return items


async def submit_detection_review(
    db: AsyncSession,
    *,
    recording: BioacousticRecording,
    reviewer_user_id: uuid.UUID,
    scientific_name: str,
    decision: str,
    notes: str | None = None,
    analysis_run_id: uuid.UUID | None = None,
) -> BioacousticDetectionReview:
    if decision not in VALID_DECISIONS:
        raise ValueError("invalid_decision")

    existing = (
        await db.execute(
            select(BioacousticDetectionReview).where(
                BioacousticDetectionReview.recording_id == recording.id,
                BioacousticDetectionReview.scientific_name == scientific_name,
                BioacousticDetectionReview.analysis_run_id == analysis_run_id,
            )
        )
    ).scalar_one_or_none()

    now = datetime.now(UTC)
    if existing:
        existing.decision = decision
        existing.notes = notes
        existing.reviewer_user_id = reviewer_user_id
        existing.reviewed_at = now
        await db.flush()
        return existing

    review = BioacousticDetectionReview(
        recording_id=recording.id,
        analysis_run_id=analysis_run_id,
        scientific_name=scientific_name,
        reviewer_user_id=reviewer_user_id,
        decision=decision,
        notes=notes,
        reviewed_at=now,
    )
    db.add(review)
    await db.flush()
    return review
