"""CRUD operations for plot monitoring designs, visits, and observations."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.plot_monitoring import (
    PlotMonitoringDesign,
    PlotMonitoringPlot,
    PlotMonitoringStratum,
    PlotObservation,
    PlotVisit,
)
from app.services.plot_monitoring.extrapolation import compute_plot_monitoring_summary
from app.services.plot_monitoring.layout import plot_to_dict

MonitoringMode = Literal["full_census", "plot_based", "hybrid"]


async def get_or_create_design(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    created_by: uuid.UUID | None = None,
) -> PlotMonitoringDesign:
    design = (
        await db.execute(
            select(PlotMonitoringDesign).where(PlotMonitoringDesign.project_id == project_id)
        )
    ).scalar_one_or_none()
    if design:
        return design
    design = PlotMonitoringDesign(
        project_id=project_id,
        created_by=created_by,
        mode="full_census",
    )
    db.add(design)
    await db.flush()
    return design


async def upsert_design(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    mode: MonitoringMode,
    stratification: str,
    plots_per_stratum: int,
    plot_area_m2: float,
    created_by: uuid.UUID | None,
) -> PlotMonitoringDesign:
    design = await get_or_create_design(db, project_id=project_id, created_by=created_by)
    design.mode = mode
    design.stratification = stratification
    design.plots_per_stratum = max(1, min(plots_per_stratum, 50))
    design.plot_area_m2 = max(25.0, min(plot_area_m2, 10_000.0))
    design.created_by = created_by
    await db.flush()
    return design


async def list_plots(db: AsyncSession, project_id: uuid.UUID) -> list[dict[str, Any]]:
    design = (
        await db.execute(
            select(PlotMonitoringDesign).where(PlotMonitoringDesign.project_id == project_id)
        )
    ).scalar_one_or_none()
    if not design:
        return []
    plots = (
        await db.execute(
            select(PlotMonitoringPlot)
            .join(PlotMonitoringStratum)
            .where(PlotMonitoringStratum.design_id == design.id)
        )
    ).scalars().all()
    return [await plot_to_dict(db, p) for p in plots]


async def record_plot_visit(
    db: AsyncSession,
    *,
    plot_id: uuid.UUID,
    visitor_id: uuid.UUID,
    observations: list[dict[str, Any]],
    notes: str | None = None,
    gps_accuracy_m: float | None = None,
) -> PlotVisit:
    plot = (
        await db.execute(select(PlotMonitoringPlot).where(PlotMonitoringPlot.id == plot_id))
    ).scalar_one_or_none()
    if plot is None:
        raise ValueError("plot_not_found")

    visit = PlotVisit(
        plot_id=plot.id,
        visited_at=datetime.now(UTC),
        visitor_id=visitor_id,
        notes=notes,
        gps_accuracy_m=gps_accuracy_m,
        status="completed",
    )
    db.add(visit)
    await db.flush()

    for obs in observations:
        db.add(
            PlotObservation(
                visit_id=visit.id,
                tree_id=uuid.UUID(obs["tree_id"]) if obs.get("tree_id") else None,
                tag_number=obs.get("tag_number"),
                species_text=obs.get("species_text"),
                dbh_cm=obs.get("dbh_cm"),
                height_m=obs.get("height_m"),
                alive=bool(obs.get("alive", True)),
            )
        )
    plot.status = "visited"
    await db.flush()
    return visit


async def design_summary(db: AsyncSession, project_id: uuid.UUID) -> dict[str, Any]:
    design = (
        await db.execute(
            select(PlotMonitoringDesign)
            .where(PlotMonitoringDesign.project_id == project_id)
            .options(
                selectinload(PlotMonitoringDesign.strata).selectinload(PlotMonitoringStratum.plots)
            )
        )
    ).scalar_one_or_none()
    extrap = await compute_plot_monitoring_summary(db, project_id)
    if design is None:
        return extrap

    return {
        **extrap,
        "design_id": str(design.id),
        "status": design.status,
        "layout_seed": design.layout_seed,
        "stratum_count": len(design.strata),
    }
