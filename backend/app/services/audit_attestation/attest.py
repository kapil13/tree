"""Reviewer attestation sign-off."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_attestation import AuditAnomalyReview, AuditReviewerAttestation
from app.models.audit_engagement import AuditEngagement
from app.services.audit_attestation.review import anomaly_review_queue

VALID_VERDICTS = {"approved", "rejected", "conditional"}


def _attestation_hash(
    *,
    engagement_id: uuid.UUID,
    export_sha: str | None,
    verdict: str,
    reviewer_id: uuid.UUID,
    summary: str,
    review_ids: list[str],
    signed_at: datetime,
) -> str:
    payload = {
        "engagement_id": str(engagement_id),
        "export_bundle_sha256": export_sha,
        "verdict": verdict,
        "reviewer_id": str(reviewer_id),
        "summary": summary,
        "review_ids": sorted(review_ids),
        "signed_at": signed_at.isoformat(),
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


async def sign_attestation(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    reviewer_id: uuid.UUID,
    verdict: str,
    summary: str,
    notes: str | None = None,
    allow_pending_reviews: bool = False,
) -> AuditReviewerAttestation:
    if engagement.status not in {"export_ready", "under_review"}:
        raise ValueError("export_not_ready")

    if verdict not in VALID_VERDICTS:
        raise ValueError("invalid_verdict")

    meta = engagement.metadata_ or {}
    export_sha = meta.get("export_bundle_sha256")
    if not export_sha:
        raise ValueError("export_not_generated")

    queue = await anomaly_review_queue(db, engagement.id)
    if queue["pending_review_count"] > 0 and not allow_pending_reviews:
        raise ValueError("pending_anomaly_reviews")

    existing = (
        await db.execute(
            select(AuditReviewerAttestation).where(
                AuditReviewerAttestation.engagement_id == engagement.id
            )
        )
    ).scalar_one_or_none()

    if existing and existing.status == "signed":
        raise ValueError("already_attested")

    if existing:
        row = existing
    else:
        row = AuditReviewerAttestation(engagement_id=engagement.id)
        db.add(row)

    reviews = (
        (
            await db.execute(
                select(AuditAnomalyReview).where(AuditAnomalyReview.engagement_id == engagement.id)
            )
        )
        .scalars()
        .all()
    )

    signed_at = datetime.now(UTC)
    row.reviewer_id = reviewer_id
    row.verdict = verdict
    row.summary = summary
    row.notes = notes
    row.export_bundle_sha256 = export_sha
    row.status = "signed"
    row.signed_at = signed_at
    row.attestation_hash = _attestation_hash(
        engagement_id=engagement.id,
        export_sha=export_sha,
        verdict=verdict,
        reviewer_id=reviewer_id,
        summary=summary,
        review_ids=[str(r.id) for r in reviews],
        signed_at=signed_at,
    )

    engagement.status = "attested"
    meta = dict(meta)
    meta["attested_at"] = signed_at.isoformat()
    meta["attestation_hash"] = row.attestation_hash
    meta["attestation_verdict"] = verdict
    engagement.metadata_ = meta
    await db.flush()
    return row


async def attestation_summary(db: AsyncSession, engagement: AuditEngagement) -> dict[str, Any]:
    row = (
        await db.execute(
            select(AuditReviewerAttestation).where(
                AuditReviewerAttestation.engagement_id == engagement.id
            )
        )
    ).scalar_one_or_none()

    queue = await anomaly_review_queue(db, engagement.id)
    meta = engagement.metadata_ or {}

    attestation: dict[str, Any] | None = None
    if row:
        attestation = {
            "id": str(row.id),
            "verdict": row.verdict,
            "summary": row.summary,
            "notes": row.notes,
            "status": row.status,
            "export_bundle_sha256": row.export_bundle_sha256,
            "attestation_hash": row.attestation_hash,
            "epistemic_label": row.epistemic_label,
            "signed_at": row.signed_at.isoformat() if row.signed_at else None,
            "reviewer_id": str(row.reviewer_id) if row.reviewer_id else None,
        }

    return {
        "engagement_id": str(engagement.id),
        "status": engagement.status,
        "export_bundle_sha256": meta.get("export_bundle_sha256"),
        "attestation": attestation,
        "review_queue": queue,
        "can_sign": engagement.status in {"export_ready", "under_review"}
        and queue["pending_review_count"] == 0
        and (row is None or row.status != "signed"),
    }
