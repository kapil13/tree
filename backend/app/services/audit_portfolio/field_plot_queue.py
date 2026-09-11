"""Cross-project audit field plot visit queue for web and mobile."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement
from app.models.audit_sampling import AuditFieldPlot
from app.models.planting_project import PlantingProject
from app.services.planting_projects.access import project_list_filter


async def _plot_center_dict(db: AsyncSession, plot: AuditFieldPlot) -> dict[str, float]:
    row = (
        await db.execute(
            select(
                func.ST_X(AuditFieldPlot.center).label("lon"),
                func.ST_Y(AuditFieldPlot.center).label("lat"),
            ).where(AuditFieldPlot.id == plot.id)
        )
    ).one_or_none()
    if row is None:
        return {"lon": 0.0, "lat": 0.0}
    return {"lon": float(row.lon), "lat": float(row.lat)}


async def build_audit_field_plot_queue(
    db: AsyncSession,
    user,
    *,
    project_id: uuid.UUID | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    """List planned audit sample plots across accessible estate watch projects."""
    stmt = (
        select(AuditFieldPlot, AuditEngagement, PlantingProject)
        .join(AuditEngagement, AuditFieldPlot.engagement_id == AuditEngagement.id)
        .join(PlantingProject, AuditEngagement.project_id == PlantingProject.id)
        .where(
            PlantingProject.scheme_code == "estate_monitoring",
            AuditFieldPlot.status != "visited",
        )
        .order_by(AuditFieldPlot.priority_rank.asc(), AuditFieldPlot.plot_code.asc())
        .limit(limit)
    )
    stmt = project_list_filter(user, stmt)
    if project_id is not None:
        stmt = stmt.where(PlantingProject.id == project_id)

    rows = (await db.execute(stmt)).all()
    items: list[dict[str, Any]] = []
    for plot, engagement, project in rows:
        center = await _plot_center_dict(db, plot)
        items.append(
            {
                "plot_id": str(plot.id),
                "plot_code": plot.plot_code,
                "engagement_id": str(engagement.id),
                "project_id": str(project.id),
                "project_code": project.code,
                "project_name": project.name,
                "risk_level": plot.risk_level,
                "priority_rank": plot.priority_rank,
                "status": plot.status,
                "engagement_status": engagement.status,
                "center": {"type": "Point", "coordinates": [center["lon"], center["lat"]]},
            }
        )

    return {
        "total_due": len(items),
        "items": items,
        "scoped_project_id": str(project_id) if project_id else None,
    }
