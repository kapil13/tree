"""GPS checks for audit field visits."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import BoundaryVersion
from app.models.audit_sampling import AuditFieldPlot
from app.services.geo import geography_as_geometry

# Warn when verifier GPS is farther than this from the planned plot center.
PLOT_CENTER_WARN_DISTANCE_M = 50.0


async def check_visit_location(
    db: AsyncSession,
    *,
    plot: AuditFieldPlot,
    visitor_lon: float,
    visitor_lat: float,
) -> dict[str, float | bool | str | None]:
    """Return distance from plot center (m) and whether GPS lies inside the block polygon."""
    boundary_geom = geography_as_geometry(BoundaryVersion.boundary)
    visitor_point = func.ST_SetSRID(func.ST_MakePoint(visitor_lon, visitor_lat), 4326)

    row = (
        await db.execute(
            select(
                func.ST_Distance(
                    AuditFieldPlot.center,
                    func.ST_GeogFromText(f"SRID=4326;POINT({visitor_lon} {visitor_lat})"),
                ).label("distance_m"),
                func.ST_Contains(boundary_geom, visitor_point).label("inside"),
            )
            .select_from(AuditFieldPlot)
            .join(BoundaryVersion, BoundaryVersion.id == AuditFieldPlot.boundary_version_id)
            .where(AuditFieldPlot.id == plot.id)
        )
    ).one()

    distance_m = float(row.distance_m) if row.distance_m is not None else None
    inside = bool(row.inside) if row.inside is not None else None
    warnings: list[str] = []
    if distance_m is not None and distance_m > PLOT_CENTER_WARN_DISTANCE_M:
        warnings.append("far_from_plot_center")
    if inside is False:
        warnings.append("outside_block_boundary")

    return {
        "distance_from_plot_m": distance_m,
        "inside_boundary": inside,
        "location_warnings": warnings,
    }


async def plot_center_lon_lat(db: AsyncSession, plot_id: uuid.UUID) -> tuple[float, float] | None:
    from app.services.geo import geography_point_xy

    lon_expr, lat_expr = geography_point_xy(AuditFieldPlot.center)
    row = (
        await db.execute(
            select(lon_expr.label("lon"), lat_expr.label("lat")).where(AuditFieldPlot.id == plot_id)
        )
    ).one_or_none()
    if row is None or row.lon is None or row.lat is None:
        return None
    return float(row.lon), float(row.lat)
