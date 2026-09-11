"""Aggregate field visit outcomes per audit block for confidence fusion."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_sampling import AuditFieldPlot, AuditFieldVisit, AuditSamplingPlan


def derive_field_grade(
    *,
    visit_count: int,
    tree_presence_counts: dict[str, int],
    outcome_counts: dict[str, int],
) -> tuple[str | None, str]:
    """Map aggregated field visits to a green/amber/red grade."""
    if visit_count == 0:
        return None, "no_field_data"

    absent = tree_presence_counts.get("absent", 0)
    sparse = tree_presence_counts.get("sparse", 0)
    present = tree_presence_counts.get("present", 0)
    unsupported = outcome_counts.get("claim_unsupported", 0)
    supported = outcome_counts.get("claim_supported", 0)

    if absent > 0 or unsupported > 0:
        return "red", "field_negative"
    if (
        present > 0
        and sparse == 0
        and unsupported == 0
        and (supported > 0 or visit_count == present)
    ):
        return "green", "field_positive"
    if sparse > 0 or (present > 0 and sparse > 0):
        return "amber", "field_mixed"
    return "amber", "field_mixed"


async def field_signals_by_boundary(
    db: AsyncSession, engagement_id: uuid.UUID
) -> dict[uuid.UUID, dict[str, Any]]:
    """Latest visit per plot, rolled up by boundary_version_id."""
    plan = (
        await db.execute(
            select(AuditSamplingPlan).where(AuditSamplingPlan.engagement_id == engagement_id)
        )
    ).scalar_one_or_none()
    if plan is None:
        return {}

    plots = (
        (
            await db.execute(
                select(AuditFieldPlot).where(AuditFieldPlot.plan_id == plan.id)
            )
        )
        .scalars()
        .all()
    )
    if not plots:
        return {}

    plot_ids = [p.id for p in plots]
    visits = (
        (
            await db.execute(
                select(AuditFieldVisit)
                .where(AuditFieldVisit.plot_id.in_(plot_ids))
                .order_by(AuditFieldVisit.visited_at.desc())
            )
        )
        .scalars()
        .all()
    )
    latest_by_plot: dict[uuid.UUID, AuditFieldVisit] = {}
    for visit in visits:
        if visit.plot_id not in latest_by_plot:
            latest_by_plot[visit.plot_id] = visit

    by_boundary: dict[uuid.UUID, list[AuditFieldVisit]] = {}
    plot_boundary = {p.id: p.boundary_version_id for p in plots}
    for plot_id, visit in latest_by_plot.items():
        boundary_id = plot_boundary.get(plot_id)
        if boundary_id is None:
            continue
        by_boundary.setdefault(boundary_id, []).append(visit)

    result: dict[uuid.UUID, dict[str, Any]] = {}
    for boundary_id, block_visits in by_boundary.items():
        presence_counts: dict[str, int] = {}
        outcome_counts: dict[str, int] = {}
        for v in block_visits:
            presence_counts[v.tree_presence] = presence_counts.get(v.tree_presence, 0) + 1
            outcome_counts[v.verification_outcome] = (
                outcome_counts.get(v.verification_outcome, 0) + 1
            )

        field_grade, field_signal = derive_field_grade(
            visit_count=len(block_visits),
            tree_presence_counts=presence_counts,
            outcome_counts=outcome_counts,
        )
        result[boundary_id] = {
            "visit_count": len(block_visits),
            "plots_visited": len(block_visits),
            "tree_presence_counts": presence_counts,
            "outcome_counts": outcome_counts,
            "field_grade": field_grade,
            "field_signal": field_signal,
        }
    return result
