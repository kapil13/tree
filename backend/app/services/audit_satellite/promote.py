"""Promote audit boundary versions to plantation fence work areas."""

from __future__ import annotations

import uuid
from typing import Any

from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement, BoundaryVersion
from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.services.geo import geography_to_geojson_polygon, geojson_polygon_to_wkt
from app.services.planting_projects.service import get_active_standard


async def promote_boundaries_to_work_areas(
    db: AsyncSession,
    engagement: AuditEngagement,
    project: PlantingProject,
    *,
    owner_user_id: uuid.UUID,
    organization_id: uuid.UUID | None,
) -> list[dict[str, Any]]:
    """Create PlantationFence work areas from boundaries not yet linked."""
    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement.id)
        )
    ).scalars().all()
    if not boundaries:
        raise ValueError("no_boundaries")

    standard = await get_active_standard(db, project)
    promoted: list[dict[str, Any]] = []

    for bv in boundaries:
        if bv.fence_id:
            fence = await db.get(PlantationFence, bv.fence_id)
            if fence:
                promoted.append(
                    {
                        "boundary_version_id": str(bv.id),
                        "fence_id": str(fence.id),
                        "name": fence.name,
                        "already_linked": True,
                    }
                )
                continue

        geojson = geography_to_geojson_polygon(bv.boundary)
        wkt = geojson_polygon_to_wkt(geojson)
        area_res = await db.execute(select(func.ST_Area(func.ST_GeogFromText(wkt)) / 10000.0))
        area_ha = round(float(area_res.scalar_one()), 4)

        fence = PlantationFence(
            name=bv.name,
            project_id=project.id,
            planting_standard_id=standard.id if standard else None,
            geometry_type="polygon",
            owner_user_id=owner_user_id,
            organization_id=organization_id or project.organization_id,
            boundary=WKTElement(wkt, srid=4326),
            area_ha=area_ha,
            metadata_={"audit_boundary_version_id": str(bv.id), "source": bv.source},
        )
        db.add(fence)
        await db.flush()

        bv.fence_id = fence.id
        promoted.append(
            {
                "boundary_version_id": str(bv.id),
                "fence_id": str(fence.id),
                "name": fence.name,
                "area_ha": area_ha,
                "already_linked": False,
            }
        )

        from app.services.monitoring.scan_targets import ensure_work_area_scan_target

        await ensure_work_area_scan_target(db, fence, project)

    if project.status == "planning":
        project.status = "active"

    await db.flush()
    return promoted
