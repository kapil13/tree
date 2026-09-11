"""Record field visits and resolve anomalies."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement
from app.models.audit_risk import AuditAnomalyEvent
from app.models.audit_sampling import AuditFieldPlot, AuditFieldVisit, AuditSamplingPlan

VerificationOutcome = str  # claim_supported | claim_unsupported | inconclusive


async def _resolve_block_anomalies(
    db: AsyncSession,
    *,
    engagement_id: uuid.UUID,
    boundary_version_id: uuid.UUID,
    outcome: str,
) -> int:
    if outcome == "inconclusive":
        return 0

    anomalies = (
        (
            await db.execute(
                select(AuditAnomalyEvent).where(
                    AuditAnomalyEvent.engagement_id == engagement_id,
                    AuditAnomalyEvent.boundary_version_id == boundary_version_id,
                    AuditAnomalyEvent.status == "open",
                )
            )
        )
        .scalars()
        .all()
    )

    resolved = 0
    for anomaly in anomalies:
        if outcome == "claim_unsupported":
            anomaly.status = "confirmed"
        elif outcome == "claim_supported":
            anomaly.status = "dismissed"
        resolved += 1
    return resolved


async def record_field_visit(
    db: AsyncSession,
    *,
    engagement: AuditEngagement,
    plot_id: uuid.UUID,
    visitor_id: uuid.UUID,
    trees_observed: int | None = None,
    trees_alive: int | None = None,
    canopy_cover_pct: float | None = None,
    verification_outcome: str = "inconclusive",
    notes: str | None = None,
    signals: dict[str, Any] | None = None,
) -> AuditFieldVisit:
    if engagement.status not in {"sampling_planned", "field_verified"}:
        raise ValueError("sampling_not_planned")

    plot = (
        await db.execute(
            select(AuditFieldPlot).where(
                AuditFieldPlot.id == plot_id,
                AuditFieldPlot.engagement_id == engagement.id,
            )
        )
    ).scalar_one_or_none()
    if plot is None:
        raise ValueError("plot_not_found")

    if verification_outcome not in {"claim_supported", "claim_unsupported", "inconclusive"}:
        raise ValueError("invalid_outcome")

    visit = AuditFieldVisit(
        plot_id=plot.id,
        visited_at=datetime.now(UTC),
        visitor_id=visitor_id,
        trees_observed=trees_observed,
        trees_alive=trees_alive,
        canopy_cover_pct=canopy_cover_pct,
        verification_outcome=verification_outcome,
        notes=notes,
        epistemic_label="OBSERVATION",
        signals=signals or {},
    )
    db.add(visit)
    plot.status = "visited"
    await db.flush()

    await _resolve_block_anomalies(
        db,
        engagement_id=engagement.id,
        boundary_version_id=plot.boundary_version_id,
        outcome=verification_outcome,
    )
    await db.flush()
    return visit


async def complete_field_verification(
    db: AsyncSession,
    engagement: AuditEngagement,
) -> dict[str, Any]:
    if engagement.status not in {"sampling_planned", "field_verified"}:
        raise ValueError("sampling_not_planned")

    plan = (
        await db.execute(
            select(AuditSamplingPlan).where(AuditSamplingPlan.engagement_id == engagement.id)
        )
    ).scalar_one_or_none()
    if plan is None:
        raise ValueError("no_sampling_plan")

    plots = (
        (await db.execute(select(AuditFieldPlot).where(AuditFieldPlot.plan_id == plan.id)))
        .scalars()
        .all()
    )
    unvisited = [p for p in plots if p.status != "visited"]
    if unvisited:
        raise ValueError("plots_unvisited")

    plan.status = "completed"
    engagement.status = "field_verified"
    meta = dict(engagement.metadata_ or {})
    meta["field_verified_at"] = datetime.now(UTC).isoformat()
    engagement.metadata_ = meta
    await db.flush()

    return {
        "plots_visited": len(plots),
        "status": engagement.status,
    }
