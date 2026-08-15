"""Generate stratified sample plots within work-area boundaries."""

from __future__ import annotations

import random
from typing import Any

from geoalchemy2 import WKTElement
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.plot_monitoring import (
    PlotMonitoringDesign,
    PlotMonitoringPlot,
    PlotMonitoringStratum,
)


async def _point_in_polygon(
    db: AsyncSession, fence: PlantationFence, rng: random.Random
) -> tuple[float, float] | None:
    """Rejection sample a point inside the work-area bounding envelope."""
    bbox = (
        await db.execute(
            select(
                func.ST_XMin(fence.boundary).label("xmin"),
                func.ST_XMax(fence.boundary).label("xmax"),
                func.ST_YMin(fence.boundary).label("ymin"),
                func.ST_YMax(fence.boundary).label("ymax"),
            )
        )
    ).one()
    for _ in range(40):
        lon = rng.uniform(float(bbox.xmin), float(bbox.xmax))
        lat = rng.uniform(float(bbox.ymin), float(bbox.ymax))
        inside = (
            await db.execute(
                select(
                    func.ST_Contains(
                        fence.boundary,
                        func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326),
                    )
                )
            )
        ).scalar_one()
        if inside:
            return lon, lat
    return None


async def generate_plots_for_design(
    db: AsyncSession,
    design: PlotMonitoringDesign,
    *,
    seed: int | None = None,
) -> list[PlotMonitoringPlot]:
    """Create strata from work areas and place random plots per stratum."""
    layout_seed = seed if seed is not None else (design.layout_seed or 42)
    rng = random.Random(layout_seed)

    fences = (
        await db.execute(
            select(PlantationFence).where(PlantationFence.project_id == design.project_id)
        )
    ).scalars().all()

    # Clear existing strata/plots for regeneration
    existing_strata = (
        await db.execute(
            select(PlotMonitoringStratum).where(PlotMonitoringStratum.design_id == design.id)
        )
    ).scalars().all()
    for stratum in existing_strata:
        await db.delete(stratum)
    await db.flush()

    created: list[PlotMonitoringPlot] = []
    if not fences:
        design.status = "active"
        design.layout_seed = layout_seed
        await db.flush()
        return created

    for idx, fence in enumerate(fences, start=1):
        stratum = PlotMonitoringStratum(
            design_id=design.id,
            work_area_id=fence.id,
            name=fence.name or f"Stratum {idx}",
            area_ha=float(fence.area_ha) if fence.area_ha else None,
        )
        db.add(stratum)
        await db.flush()

        for plot_n in range(1, design.plots_per_stratum + 1):
            coords = await _point_in_polygon(db, fence, rng)
            if coords is None:
                continue
            lon, lat = coords
            plot = PlotMonitoringPlot(
                stratum_id=stratum.id,
                plot_code=f"{stratum.name[:8].replace(' ', '-')}-P{plot_n:02d}",
                center=WKTElement(f"POINT({lon} {lat})", srid=4326),
                status="active",
            )
            db.add(plot)
            created.append(plot)

    design.layout_seed = layout_seed
    design.status = "active"
    await db.flush()
    return created


async def plot_to_dict(db: AsyncSession, plot: PlotMonitoringPlot) -> dict[str, Any]:
    row = (
        await db.execute(
            select(
                func.ST_X(PlotMonitoringPlot.center).label("lon"),
                func.ST_Y(PlotMonitoringPlot.center).label("lat"),
            ).where(PlotMonitoringPlot.id == plot.id)
        )
    ).one_or_none()
    lon = float(row.lon) if row else 0.0
    lat = float(row.lat) if row else 0.0
    return {
        "id": str(plot.id),
        "stratum_id": str(plot.stratum_id),
        "plot_code": plot.plot_code,
        "status": plot.status,
        "center": {"type": "Point", "coordinates": [lon, lat]},
    }
