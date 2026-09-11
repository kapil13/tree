"""Generate and persist risk-weighted audit sampling plans."""

from __future__ import annotations

import random
import re
import uuid
from datetime import UTC, datetime

from geoalchemy2 import WKTElement
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement, BoundaryVersion
from app.models.audit_risk import AuditRiskAssessment
from app.models.audit_sampling import AuditFieldPlot, AuditSamplingPlan
from app.services.audit_sampling.stratify import stratified_plot_counts


async def _point_in_boundary(
    db: AsyncSession, boundary_version_id: uuid.UUID, rng: random.Random
) -> tuple[float, float] | None:
    bbox = (
        await db.execute(
            select(
                func.ST_XMin(BoundaryVersion.boundary).label("xmin"),
                func.ST_XMax(BoundaryVersion.boundary).label("xmax"),
                func.ST_YMin(BoundaryVersion.boundary).label("ymin"),
                func.ST_YMax(BoundaryVersion.boundary).label("ymax"),
            ).where(BoundaryVersion.id == boundary_version_id)
        )
    ).one()
    xmin, xmax = float(bbox.xmin), float(bbox.xmax)
    ymin, ymax = float(bbox.ymin), float(bbox.ymax)
    if xmin >= xmax or ymin >= ymax:
        return None
    for _ in range(40):
        lon = rng.uniform(xmin, xmax)
        lat = rng.uniform(ymin, ymax)
        inside = (
            await db.execute(
                select(
                    func.ST_Contains(
                        BoundaryVersion.boundary,
                        func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326),
                    )
                ).where(BoundaryVersion.id == boundary_version_id)
            )
        ).scalar_one()
        if inside:
            return lon, lat
    return None


def _slug_block_name(name: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "-", name.strip())[:12].strip("-")
    return slug or "BLOCK"


async def generate_sampling_plan(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    plots_per_critical: int = 3,
    plots_per_high: int = 2,
    plots_per_medium: int = 1,
    plots_per_low: int = 0,
    layout_seed: int | None = None,
) -> AuditSamplingPlan:
    if engagement.status not in {"risk_assessed", "sampling_planned", "field_verified"}:
        raise ValueError("risk_not_assessed")

    risk_rows = (
        (
            await db.execute(
                select(AuditRiskAssessment)
                .where(AuditRiskAssessment.engagement_id == engagement.id)
                .order_by(AuditRiskAssessment.priority_rank.asc())
            )
        )
        .scalars()
        .all()
    )
    if not risk_rows:
        raise ValueError("no_risk_assessments")

    boundaries = (
        (
            await db.execute(
                select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement.id)
            )
        )
        .scalars()
        .all()
    )
    boundary_map = {b.id: b for b in boundaries}
    name_map = {b.id: b.name for b in boundaries}

    queue_blocks = [
        {
            "boundary_version_id": str(r.boundary_version_id),
            "risk_assessment_id": str(r.id),
            "risk_level": r.risk_level,
            "priority_rank": r.priority_rank,
            "boundary_name": name_map.get(r.boundary_version_id),
        }
        for r in risk_rows
    ]
    stratified = stratified_plot_counts(
        queue_blocks,
        plots_per_critical=plots_per_critical,
        plots_per_high=plots_per_high,
        plots_per_medium=plots_per_medium,
        plots_per_low=plots_per_low,
    )
    if not stratified:
        raise ValueError("no_plots_required")

    seed = layout_seed if layout_seed is not None else random.randint(1, 999_999)
    rng = random.Random(seed)
    planned_at = datetime.now(UTC)

    existing = (
        await db.execute(
            select(AuditSamplingPlan).where(AuditSamplingPlan.engagement_id == engagement.id)
        )
    ).scalar_one_or_none()

    if existing:
        plan = existing
        for plot in list(plan.plots):
            await db.delete(plot)
        await db.flush()
    else:
        plan = AuditSamplingPlan(engagement_id=engagement.id)
        db.add(plan)
        await db.flush()

    plan.stratification = "risk_weighted"
    plan.plots_per_critical = plots_per_critical
    plan.plots_per_high = plots_per_high
    plan.plots_per_medium = plots_per_medium
    plan.plots_per_low = plots_per_low
    plan.layout_seed = seed
    plan.status = "active"
    plan.epistemic_label = "ESTIMATION"
    plan.planned_at = planned_at

    created_plots: list[AuditFieldPlot] = []
    for block in stratified:
        bv_id = uuid.UUID(block["boundary_version_id"])
        bv = boundary_map.get(bv_id)
        if bv is None:
            continue
        slug = _slug_block_name(block.get("boundary_name") or "block")
        plot_count = int(block["plot_count"])
        for plot_n in range(1, plot_count + 1):
            coords = await _point_in_boundary(db, bv.id, rng)
            if coords is None:
                continue
            lon, lat = coords
            plot = AuditFieldPlot(
                engagement_id=engagement.id,
                plan_id=plan.id,
                boundary_version_id=bv.id,
                risk_assessment_id=uuid.UUID(block["risk_assessment_id"]),
                plot_code=f"{slug}-P{plot_n:02d}",
                center=WKTElement(f"POINT({lon} {lat})", srid=4326),
                risk_level=block["risk_level"],
                priority_rank=block["priority_rank"],
                status="planned",
                metadata_={"block_name": block.get("boundary_name")},
            )
            db.add(plot)
            created_plots.append(plot)

    plan.total_plots = len(created_plots)
    if plan.total_plots == 0:
        raise ValueError("plot_placement_failed")

    engagement.status = "sampling_planned"
    meta = dict(engagement.metadata_ or {})
    meta["sampling_planned_at"] = planned_at.isoformat()
    engagement.metadata_ = meta
    await db.flush()
    return plan
