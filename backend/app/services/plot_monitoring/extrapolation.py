"""Extrapolate plot observations to stratum and project biomass."""

from __future__ import annotations

import math
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.plot_monitoring import (
    PlotMonitoringDesign,
    PlotMonitoringStratum,
    PlotVisit,
)


def _stem_biomass_kg(dbh_cm: float | None, height_m: float | None) -> float:
    """Simple IPCC-style stem biomass proxy from DBH (kg)."""
    if dbh_cm is None or dbh_cm <= 0:
        return 0.0
    dbh_m = dbh_cm / 100.0
    h = height_m if height_m and height_m > 0 else max(2.0, dbh_m * 20)
    # Rough volume proxy: π * (dbh/2)^2 * height * wood density
    return max(0.0, math.pi * (dbh_m / 2) ** 2 * h * 450.0)


async def compute_plot_monitoring_summary(
    db: AsyncSession, project_id: uuid.UUID
) -> dict[str, Any]:
    design = (
        await db.execute(
            select(PlotMonitoringDesign).where(PlotMonitoringDesign.project_id == project_id)
        )
    ).scalar_one_or_none()
    if design is None:
        return {
            "project_id": str(project_id),
            "mode": "full_census",
            "has_design": False,
        }

    strata = (
        await db.execute(
            select(PlotMonitoringStratum)
            .where(PlotMonitoringStratum.design_id == design.id)
            .options(selectinload(PlotMonitoringStratum.plots))
        )
    ).scalars().all()

    plot_area_ha = float(design.plot_area_m2) / 10_000.0
    stratum_results: list[dict[str, Any]] = []
    total_biomass_kg = 0.0
    total_plots = 0
    visited_plots = 0

    for stratum in strata:
        stratum_biomass = 0.0
        stratum_plots = len(stratum.plots)
        stratum_visited = 0
        total_plots += stratum_plots

        for plot in stratum.plots:
            latest_visit = (
                await db.execute(
                    select(PlotVisit)
                    .where(PlotVisit.plot_id == plot.id)
                    .order_by(PlotVisit.visited_at.desc())
                    .limit(1)
                    .options(selectinload(PlotVisit.observations))
                )
            ).scalar_one_or_none()
            if latest_visit is None:
                continue
            stratum_visited += 1
            visited_plots += 1
            plot_biomass = sum(
                _stem_biomass_kg(
                    float(o.dbh_cm) if o.dbh_cm else None,
                    float(o.height_m) if o.height_m else None,
                )
                for o in latest_visit.observations
                if o.alive
            )
            # Expand plot biomass to stratum area
            area_ha = float(stratum.area_ha) if stratum.area_ha else plot_area_ha * stratum_plots
            if plot_area_ha > 0 and plot_biomass > 0:
                stratum_biomass += (plot_biomass / plot_area_ha) * area_ha

        stratum_results.append(
            {
                "stratum_id": str(stratum.id),
                "name": stratum.name,
                "area_ha": float(stratum.area_ha) if stratum.area_ha else None,
                "plot_count": stratum_plots,
                "visited_plot_count": stratum_visited,
                "extrapolated_biomass_kg": round(stratum_biomass, 2),
            }
        )
        total_biomass_kg += stratum_biomass

    total_carbon_kg = total_biomass_kg * 0.47
    total_co2e_kg = total_carbon_kg * (44.0 / 12.0)
    uncertainty_pct = 25.0 if visited_plots < max(1, total_plots // 2) else 15.0
    half_width = total_co2e_kg * (uncertainty_pct / 100.0) * 0.5

    return {
        "project_id": str(project_id),
        "has_design": True,
        "mode": design.mode,
        "stratification": design.stratification,
        "plot_area_m2": float(design.plot_area_m2),
        "plots_per_stratum": design.plots_per_stratum,
        "total_plots": total_plots,
        "visited_plots": visited_plots,
        "strata": stratum_results,
        "extrapolated_biomass_kg": round(total_biomass_kg, 2),
        "extrapolated_carbon_kg": round(total_carbon_kg, 2),
        "extrapolated_co2e_kg": round(total_co2e_kg, 2),
        "co2e_kg_lower_90": round(max(0.0, total_co2e_kg - half_width * 1.645), 2),
        "co2e_kg_upper_90": round(total_co2e_kg + half_width * 1.645, 2),
        "uncertainty_pct": uncertainty_pct,
        "disclosure": "Extrapolated from plot visits — not a full tree census",
    }
