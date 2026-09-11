"""Sampling plan and field visit summaries."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import BoundaryVersion
from app.models.audit_sampling import AuditFieldPlot, AuditFieldVisit, AuditSamplingPlan
from app.services.geo import geography_point_xy


async def _plot_center_dict(db: AsyncSession, plot: AuditFieldPlot) -> dict[str, float]:
    lon_expr, lat_expr = geography_point_xy(AuditFieldPlot.center)
    row = (
        await db.execute(
            select(
                lon_expr.label("lon"),
                lat_expr.label("lat"),
            ).where(AuditFieldPlot.id == plot.id)
        )
    ).one_or_none()
    if row is None:
        return {"lon": 0.0, "lat": 0.0}
    return {"lon": float(row.lon), "lat": float(row.lat)}


async def sampling_plan_summary(db: AsyncSession, engagement_id: uuid.UUID) -> dict[str, Any]:
    plan = (
        await db.execute(
            select(AuditSamplingPlan).where(AuditSamplingPlan.engagement_id == engagement_id)
        )
    ).scalar_one_or_none()

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

    if plan is None:
        return {
            "engagement_id": str(engagement_id),
            "has_plan": False,
            "plan": None,
            "plots": [],
            "visit_stats": {"total": 0, "visited": 0, "planned": 0},
        }

    plots = (
        (
            await db.execute(
                select(AuditFieldPlot)
                .where(AuditFieldPlot.plan_id == plan.id)
                .order_by(AuditFieldPlot.priority_rank.asc(), AuditFieldPlot.plot_code.asc())
            )
        )
        .scalars()
        .all()
    )

    plot_ids = [p.id for p in plots]
    visits_by_plot: dict[uuid.UUID, list[AuditFieldVisit]] = {}
    if plot_ids:
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
        for v in visits:
            visits_by_plot.setdefault(v.plot_id, []).append(v)

    plot_rows: list[dict[str, Any]] = []
    visited_count = 0
    for plot in plots:
        if plot.status == "visited":
            visited_count += 1
        center = await _plot_center_dict(db, plot)
        latest = visits_by_plot.get(plot.id, [None])[0]
        plot_rows.append(
            {
                "id": str(plot.id),
                "plot_code": plot.plot_code,
                "boundary_version_id": str(plot.boundary_version_id),
                "boundary_name": name_map.get(plot.boundary_version_id),
                "risk_level": plot.risk_level,
                "priority_rank": plot.priority_rank,
                "status": plot.status,
                "center": {"type": "Point", "coordinates": [center["lon"], center["lat"]]},
                "latest_visit": (
                    {
                        "id": str(latest.id),
                        "verification_outcome": latest.verification_outcome,
                        "tree_presence": latest.tree_presence,
                        "trees_observed": latest.trees_observed,
                        "trees_alive": latest.trees_alive,
                        "canopy_cover_pct": float(latest.canopy_cover_pct)
                        if latest.canopy_cover_pct is not None
                        else None,
                        "visitor_lat": float(latest.visitor_lat)
                        if latest.visitor_lat is not None
                        else None,
                        "visitor_lon": float(latest.visitor_lon)
                        if latest.visitor_lon is not None
                        else None,
                        "distance_from_plot_m": float(latest.distance_from_plot_m)
                        if latest.distance_from_plot_m is not None
                        else None,
                        "inside_boundary": latest.inside_boundary,
                        "photo_keys": list(latest.photo_keys or []),
                        "location_warnings": list(
                            (latest.signals or {}).get("location_warnings") or []
                        ),
                        "visited_at": latest.visited_at.isoformat(),
                        "notes": latest.notes,
                    }
                    if latest
                    else None
                ),
            }
        )

    return {
        "engagement_id": str(engagement_id),
        "has_plan": True,
        "plan": {
            "id": str(plan.id),
            "stratification": plan.stratification,
            "plots_per_critical": plan.plots_per_critical,
            "plots_per_high": plan.plots_per_high,
            "plots_per_medium": plan.plots_per_medium,
            "plots_per_low": plan.plots_per_low,
            "ha_per_plot": float(plan.ha_per_plot) if plan.ha_per_plot is not None else None,
            "min_plots_per_block": plan.min_plots_per_block,
            "total_plots": plan.total_plots,
            "status": plan.status,
            "epistemic_label": plan.epistemic_label,
            "planned_at": plan.planned_at.isoformat() if plan.planned_at else None,
        },
        "plots": plot_rows,
        "visit_stats": {
            "total": len(plots),
            "visited": visited_count,
            "planned": len(plots) - visited_count,
        },
    }
