"""Record field visits and resolve anomalies."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement
from app.models.audit_risk import AuditAnomalyEvent
from app.models.audit_sampling import AuditFieldPlot, AuditFieldVisit
from app.schemas.audit_sampling import TREE_PRESENCE_VALUES
from app.services.audit_sampling.integrity import check_gps_integrity, check_photo_integrity
from app.services.audit_sampling.location import check_visit_location
from app.services.audit_sampling.queries import get_active_sampling_plan

VerificationOutcome = str  # claim_supported | claim_unsupported | inconclusive

ACCEPTED_VISIT_STATUSES = frozenset({"accepted"})


async def _resolve_block_anomalies(
    db: AsyncSession,
    *,
    engagement_id: uuid.UUID,
    cycle_id: uuid.UUID,
    boundary_version_id: uuid.UUID,
    outcome: str,
) -> int:
    if outcome == "inconclusive":
        return 0

    anomalies = (
        (
            await db.execute(
                select(AuditAnomalyEvent).where(
                    AuditAnomalyEvent.cycle_id == cycle_id,
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
    tree_presence: str,
    photo_keys: list[str],
    visitor_lat: float,
    visitor_lon: float,
    trees_observed: int | None = None,
    trees_alive: int | None = None,
    canopy_cover_pct: float | None = None,
    verification_outcome: str = "inconclusive",
    notes: str | None = None,
    signals: dict[str, Any] | None = None,
    idempotency_key: str | None = None,
) -> AuditFieldVisit:
    from app.services.audit_evidence.graph import sync_cycle_evidence_graph
    from app.services.audit_governance.engagement import require_mutable_cycle

    cycle = await require_mutable_cycle(db, engagement)
    if engagement.status not in {"sampling_planned", "field_verified"}:
        raise ValueError("sampling_not_planned")

    if tree_presence not in TREE_PRESENCE_VALUES:
        raise ValueError("invalid_tree_presence")

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

    active_plan = await get_active_sampling_plan(db, cycle.id)
    if active_plan is None or plot.plan_id != active_plan.id:
        raise ValueError("plot_not_in_active_plan")

    if idempotency_key:
        existing = (
            await db.execute(
                select(AuditFieldVisit).where(
                    AuditFieldVisit.plot_id == plot.id,
                    AuditFieldVisit.idempotency_key == idempotency_key,
                )
            )
        ).scalar_one_or_none()
        if existing is not None:
            return existing

    if verification_outcome not in {"claim_supported", "claim_unsupported", "inconclusive"}:
        raise ValueError("invalid_outcome")

    if not photo_keys:
        raise ValueError("photo_required")

    photo_ok, photo_meta = check_photo_integrity(photo_keys)
    if not photo_ok:
        raise ValueError("photo_integrity_failed")

    location = await check_visit_location(
        db,
        plot=plot,
        visitor_lon=visitor_lon,
        visitor_lat=visitor_lat,
    )
    location_warnings = list(location.get("location_warnings") or [])
    gps_ok, gps_meta = check_gps_integrity(
        inside_boundary=location.get("inside_boundary"),
        location_warnings=location_warnings,
    )
    if not gps_ok:
        raise ValueError("gps_integrity_failed")

    merged_signals = dict(signals or {})
    merged_signals["photo_integrity"] = photo_meta
    merged_signals["gps_integrity"] = gps_meta
    if location_warnings:
        merged_signals["location_warnings"] = location_warnings

    submitted_at = datetime.now(UTC)
    visit = AuditFieldVisit(
        plot_id=plot.id,
        cycle_id=cycle.id,
        visited_at=submitted_at,
        submitted_at=submitted_at,
        visitor_id=visitor_id,
        tree_presence=tree_presence,
        visitor_lat=visitor_lat,
        visitor_lon=visitor_lon,
        distance_from_plot_m=location.get("distance_from_plot_m"),
        inside_boundary=location.get("inside_boundary"),
        photo_keys=photo_keys,
        trees_observed=trees_observed,
        trees_alive=trees_alive,
        canopy_cover_pct=canopy_cover_pct,
        verification_outcome=verification_outcome,
        notes=notes,
        epistemic_label="OBSERVATION",
        signals=merged_signals,
        status="accepted",
        idempotency_key=idempotency_key,
        gps_integrity_passed=gps_ok,
        photo_integrity_passed=photo_ok,
    )
    db.add(visit)
    plot.status = "visited"
    await db.flush()

    await _resolve_block_anomalies(
        db,
        engagement_id=engagement.id,
        cycle_id=cycle.id,
        boundary_version_id=plot.boundary_version_id,
        outcome=verification_outcome,
    )
    await sync_cycle_evidence_graph(db, engagement, cycle.id)
    await db.flush()
    return visit


async def complete_field_verification(
    db: AsyncSession,
    engagement: AuditEngagement,
) -> dict[str, Any]:
    from app.services.audit_governance.engagement import (
        require_mutable_cycle,
        set_engagement_status,
    )
    from app.services.audit_reconciliation.persist import persist_reconciliation_run

    cycle = await require_mutable_cycle(db, engagement)
    if engagement.status not in {"sampling_planned", "field_verified"}:
        raise ValueError("sampling_not_planned")

    plan = await get_active_sampling_plan(db, cycle.id)
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
    meta = dict(engagement.metadata_ or {})
    meta["field_verified_at"] = datetime.now(UTC).isoformat()
    engagement.metadata_ = meta
    await set_engagement_status(db, engagement, "field_verified")

    try:
        from app.services.audit_confidence.compute import compute_confidence_map

        await compute_confidence_map(db, engagement, include_field_signals=True)
        meta = dict(engagement.metadata_ or {})
        meta["confidence_auto_refreshed_after_field"] = True
        engagement.metadata_ = meta
        await db.flush()
    except ValueError:
        pass

    await persist_reconciliation_run(db, engagement, cycle)

    return {
        "plots_visited": len(plots),
        "status": engagement.status,
        "plan_version": plan.plan_version,
    }
