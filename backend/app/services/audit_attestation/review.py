"""Anomaly review and dispute resolution."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_attestation import AuditAnomalyReview
from app.models.audit_engagement import AuditEngagement, BoundaryVersion
from app.models.audit_risk import AuditAnomalyEvent

VALID_DISPOSITIONS = {"uphold", "overturn", "defer"}


def _resolve_new_status(anomaly: AuditAnomalyEvent, disposition: str) -> str:
    current = anomaly.status
    if disposition == "defer":
        return "open"
    if disposition == "uphold":
        return current if current != "open" else "confirmed"
    # overturn — flip confirmed/dismissed or close open as dismissed
    if current == "confirmed":
        return "dismissed"
    if current == "dismissed":
        return "confirmed"
    return "dismissed"


async def review_anomaly(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    anomaly_id: uuid.UUID,
    reviewer_id: uuid.UUID,
    disposition: str,
    rationale: str,
) -> AuditAnomalyReview:
    if engagement.status not in {"export_ready", "under_review", "attested"}:
        raise ValueError("export_not_ready")

    if disposition not in VALID_DISPOSITIONS:
        raise ValueError("invalid_disposition")

    anomaly = (
        await db.execute(
            select(AuditAnomalyEvent).where(
                AuditAnomalyEvent.id == anomaly_id,
                AuditAnomalyEvent.engagement_id == engagement.id,
            )
        )
    ).scalar_one_or_none()
    if anomaly is None:
        raise ValueError("anomaly_not_found")

    previous = anomaly.status
    new_status = _resolve_new_status(anomaly, disposition)
    reviewed_at = datetime.now(UTC)

    review = AuditAnomalyReview(
        engagement_id=engagement.id,
        anomaly_id=anomaly.id,
        reviewer_id=reviewer_id,
        disposition=disposition,
        previous_status=previous,
        new_status=new_status,
        rationale=rationale,
        reviewed_at=reviewed_at,
    )
    db.add(review)
    anomaly.status = new_status

    if engagement.status == "export_ready":
        engagement.status = "under_review"
        meta = dict(engagement.metadata_ or {})
        meta["under_review_at"] = reviewed_at.isoformat()
        engagement.metadata_ = meta

    await db.flush()
    return review


async def anomaly_review_queue(db: AsyncSession, engagement_id: uuid.UUID) -> dict[str, Any]:
    boundaries = (
        (
            await db.execute(
                select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement_id)
            )
        )
        .scalars()
        .all()
    )
    name_map = {b.id: b.name for b in boundaries}

    anomalies = (
        (
            await db.execute(
                select(AuditAnomalyEvent)
                .where(AuditAnomalyEvent.engagement_id == engagement_id)
                .order_by(AuditAnomalyEvent.severity.desc(), AuditAnomalyEvent.detected_at.desc())
            )
        )
        .scalars()
        .all()
    )

    reviews = (
        (
            await db.execute(
                select(AuditAnomalyReview)
                .where(AuditAnomalyReview.engagement_id == engagement_id)
                .order_by(AuditAnomalyReview.reviewed_at.desc())
            )
        )
        .scalars()
        .all()
    )

    latest_review: dict[uuid.UUID, AuditAnomalyReview] = {}
    for r in reviews:
        if r.anomaly_id not in latest_review:
            latest_review[r.anomaly_id] = r

    items: list[dict[str, Any]] = []
    pending = 0
    for a in anomalies:
        lr = latest_review.get(a.id)
        needs_review = a.status == "open" or (a.severity in {"critical", "high"} and lr is None)
        if needs_review:
            pending += 1
        items.append(
            {
                "id": str(a.id),
                "boundary_version_id": str(a.boundary_version_id),
                "boundary_name": name_map.get(a.boundary_version_id),
                "anomaly_type": a.anomaly_type,
                "severity": a.severity,
                "title": a.title,
                "summary": a.summary,
                "status": a.status,
                "needs_review": needs_review,
                "latest_review": (
                    {
                        "id": str(lr.id),
                        "disposition": lr.disposition,
                        "rationale": lr.rationale,
                        "reviewed_at": lr.reviewed_at.isoformat(),
                        "reviewer_id": str(lr.reviewer_id) if lr.reviewer_id else None,
                    }
                    if lr
                    else None
                ),
            }
        )

    return {
        "engagement_id": str(engagement_id),
        "anomaly_count": len(anomalies),
        "pending_review_count": pending,
        "items": items,
    }
