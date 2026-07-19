"""Monitoring portfolio summary for supervisor dashboard."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert
from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.planting_project import PlantingProject
from app.services.monitoring.job_runs import get_recent_job_runs
from app.services.planting_projects.access import project_list_filter
from app.services.planting_projects.field_ops import build_field_ops_summary


async def build_monitoring_summary(db: AsyncSession, user) -> dict[str, Any]:
    field_ops = await build_field_ops_summary(db, user)

    stmt = select(PlantingProject)
    stmt = project_list_filter(user, stmt)
    projects = list((await db.execute(stmt)).scalars().all())
    project_ids = [p.id for p in projects]

    stale_satellite = 0
    work_area_rows: list[dict[str, Any]] = []
    if project_ids:
        fences = list(
            (
                await db.execute(
                    select(PlantationFence).where(PlantationFence.project_id.in_(project_ids))
                )
            ).scalars().all()
        )
        now = datetime.now(UTC)
        for fence in fences:
            days_since = None
            latest_ndvi = None
            if fence.last_satellite_at:
                days_since = (now - fence.last_satellite_at).days
                if days_since > 35:
                    stale_satellite += 1
            rec = (
                await db.execute(
                    select(PlantationSatelliteRecord)
                    .where(PlantationSatelliteRecord.fence_id == fence.id)
                    .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
                    .limit(1)
                )
            ).scalar_one_or_none()
            if rec and rec.ndvi_mean is not None:
                latest_ndvi = float(rec.ndvi_mean)
            project = next((p for p in projects if p.id == fence.project_id), None)
            work_area_rows.append(
                {
                    "id": str(fence.id),
                    "name": fence.name,
                    "project_id": str(fence.project_id) if fence.project_id else None,
                    "project_name": project.name if project else None,
                    "segment": project.segment if project else None,
                    "last_satellite_at": fence.last_satellite_at.isoformat()
                    if fence.last_satellite_at
                    else None,
                    "days_since_scan": days_since,
                    "latest_ndvi": latest_ndvi,
                    "tree_count": None,
                }
            )

    alert_counts: dict[str, int] = {}
    if user.role == "admin":
        kinds_res = await db.execute(
            select(Alert.kind, func.count())
            .where(Alert.is_read.is_(False), Alert.created_at >= datetime.now(UTC) - timedelta(days=30))
            .group_by(Alert.kind)
        )
    else:
        kinds_res = await db.execute(
            select(Alert.kind, func.count())
            .where(
                Alert.user_id == user.id,
                Alert.is_read.is_(False),
                Alert.created_at >= datetime.now(UTC) - timedelta(days=30),
            )
            .group_by(Alert.kind)
        )
    for kind, count in kinds_res.all():
        alert_counts[kind] = int(count)

    return {
        **field_ops,
        "stale_satellite_work_areas": stale_satellite,
        "work_area_monitoring": work_area_rows[:100],
        "unread_alerts_by_kind": alert_counts,
        "recent_jobs": await get_recent_job_runs(db, limit=10),
    }
