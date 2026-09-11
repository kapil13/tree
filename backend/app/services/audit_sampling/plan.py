"""Generate and persist risk-weighted audit sampling plans."""

from __future__ import annotations

import random
import re
import uuid
from datetime import UTC, datetime
from typing import Any

from geoalchemy2 import WKTElement
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement, BoundaryVersion
from app.models.audit_risk import AuditRiskAssessment
from app.models.audit_sampling import AuditFieldPlot, AuditSamplingPlan
from app.services.audit_sampling.stratify import (
    SamplingMode,
    estimate_total_plots,
    stratified_plot_counts,
)
from app.services.geo import geography_as_geometry


async def _point_in_boundary(
    db: AsyncSession, boundary_version_id: uuid.UUID, rng: random.Random
) -> tuple[float, float] | None:
    # boundary_versions.boundary is Geography — cast to geometry for ST_XMin/ST_Contains.
    boundary_geom = geography_as_geometry(BoundaryVersion.boundary)
    bbox = (
        await db.execute(
            select(
                func.ST_XMin(boundary_geom).label("xmin"),
                func.ST_XMax(boundary_geom).label("xmax"),
                func.ST_YMin(boundary_geom).label("ymin"),
                func.ST_YMax(boundary_geom).label("ymax"),
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
        point = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
        inside = (
            await db.execute(
                select(func.ST_Contains(boundary_geom, point)).where(
                    BoundaryVersion.id == boundary_version_id
                )
            )
        ).scalar_one()
        if inside:
            return lon, lat

    # Fallback for small or awkward polygons when rejection sampling fails.
    surface = (
        await db.execute(
            select(
                func.ST_X(func.ST_PointOnSurface(boundary_geom)).label("lon"),
                func.ST_Y(func.ST_PointOnSurface(boundary_geom)).label("lat"),
            ).where(BoundaryVersion.id == boundary_version_id)
        )
    ).one_or_none()
    if surface is None or surface.lon is None or surface.lat is None:
        return None
    return float(surface.lon), float(surface.lat)


def _slug_block_name(name: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "-", name.strip())[:12].strip("-")
    return slug or "BLOCK"


async def preview_sampling_plan(
    db: AsyncSession,
    engagement: AuditEngagement,
    **params: Any,
) -> dict[str, Any]:
    queue_blocks = await _queue_blocks_for_engagement(db, engagement)
    return estimate_total_plots(queue_blocks, **params)


async def _queue_blocks_for_engagement(
    db: AsyncSession,
    engagement: AuditEngagement,
) -> list[dict[str, Any]]:
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

    return [
        {
            "boundary_version_id": str(r.boundary_version_id),
            "risk_assessment_id": str(r.id),
            "risk_level": r.risk_level,
            "priority_rank": r.priority_rank,
            "boundary_name": name_map.get(r.boundary_version_id),
            "area_ha_measured": float(boundary_map[r.boundary_version_id].area_ha_measured)
            if r.boundary_version_id in boundary_map
            and boundary_map[r.boundary_version_id].area_ha_measured is not None
            else None,
            "area_ha_claimed": float(boundary_map[r.boundary_version_id].area_ha_claimed)
            if r.boundary_version_id in boundary_map
            and boundary_map[r.boundary_version_id].area_ha_claimed is not None
            else None,
        }
        for r in risk_rows
    ]


async def generate_sampling_plan(
    db: AsyncSession,
    engagement: AuditEngagement,
    *,
    plots_per_critical: int = 3,
    plots_per_high: int = 2,
    plots_per_medium: int = 1,
    plots_per_low: int = 0,
    sampling_mode: SamplingMode = "risk_weighted",
    ha_per_plot: float = 50.0,
    min_plots_per_block: int = 1,
    layout_seed: int | None = None,
) -> AuditSamplingPlan:
    if engagement.status not in {"risk_assessed", "sampling_planned", "field_verified"}:
        raise ValueError("risk_not_assessed")

    queue_blocks = await _queue_blocks_for_engagement(db, engagement)
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

    stratified = stratified_plot_counts(
        queue_blocks,
        plots_per_critical=plots_per_critical,
        plots_per_high=plots_per_high,
        plots_per_medium=plots_per_medium,
        plots_per_low=plots_per_low,
        sampling_mode=sampling_mode,
        ha_per_plot=ha_per_plot,
        min_plots_per_block=min_plots_per_block,
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
        await db.execute(delete(AuditFieldPlot).where(AuditFieldPlot.plan_id == plan.id))
    else:
        plan = AuditSamplingPlan(engagement_id=engagement.id)
        db.add(plan)

    plan.stratification = sampling_mode
    plan.plots_per_critical = plots_per_critical
    plan.plots_per_high = plots_per_high
    plan.plots_per_medium = plots_per_medium
    plan.plots_per_low = plots_per_low
    plan.ha_per_plot = ha_per_plot if sampling_mode != "risk_weighted" else None
    plan.min_plots_per_block = max(1, min_plots_per_block)
    plan.layout_seed = seed
    plan.status = "active"
    plan.epistemic_label = "ESTIMATION"
    plan.planned_at = planned_at
    await db.flush()

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
    await db.refresh(plan)
    return plan
