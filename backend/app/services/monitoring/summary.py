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
from app.services.monitoring.sar_ops_dashboard import (
    build_sar_ops_summary,
    list_open_sar_field_verifications,
)
from app.services.monitoring.scan_ops import build_scan_engine_summary
from app.services.planting_projects.access import project_list_filter
from app.services.planting_projects.field_ops import build_field_ops_summary

SAR_ALERT_KINDS = {
    "sar_integrity_drop",
    "sar_optical_divergent",
    "sar_integrity_at_risk",
    "sar_monsoon_gap_fill",
    "sar_hidden_moisture",
    "sar_wetland_detected",
    "sar_flood_risk",
    "sar_ground_moisture",
    "sar_ground_instability",
    "sar_sweep_health",
}

HAZARD_ALERT_KINDS = {
    "fire_alert",
    "flood_extent_alert",
    "ndvi_acute_drop",
    "canopy_loss_suspected",
    "locust_watch",
}


async def build_monitoring_summary(db: AsyncSession, user) -> dict[str, Any]:
    field_ops = await build_field_ops_summary(db, user)

    stmt = select(PlantingProject)
    stmt = project_list_filter(user, stmt)
    projects = list((await db.execute(stmt)).scalars().all())
    project_ids = [p.id for p in projects]

    stale_satellite = 0
    work_area_rows: list[dict[str, Any]] = []
    sar_ops: dict[str, Any] = {
        "sar_aligned_work_areas": 0,
        "sar_divergent_work_areas": 0,
        "sar_gap_fill_work_areas": 0,
        "sar_at_risk_work_areas": 0,
        "stale_sar_work_areas": 0,
        "sar_live_providers": 0,
        "sar_stub_providers": 0,
        "sar_avg_forest_integrity": None,
        "work_areas": [],
    }

    if project_ids:
        fences = list(
            (
                await db.execute(
                    select(PlantationFence).where(PlantationFence.project_id.in_(project_ids))
                )
            ).scalars().all()
        )
        sar_ops = await build_sar_ops_summary(db, fences)
        sar_by_fence = {row["fence_id"]: row for row in sar_ops.get("work_areas", [])}
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
            sar_row = sar_by_fence.get(str(fence.id), {})
            work_area_rows.append(
                {
                    "id": str(fence.id),
                    "name": fence.name,
                    "project_id": str(fence.project_id) if fence.project_id else None,
                    "project_name": project.name if project else None,
                    "scheme_code": project.scheme_code if project else None,
                    "segment": project.segment if project else None,
                    "last_satellite_at": fence.last_satellite_at.isoformat()
                    if fence.last_satellite_at
                    else None,
                    "days_since_scan": days_since,
                    "latest_ndvi": latest_ndvi,
                    "tree_count": None,
                    "sar_recommended_action": sar_row.get("sar_recommended_action"),
                    **{k: v for k, v in sar_row.items() if k not in {"fence_id", "fence_name", "project_id"}},
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

    sar_alert_counts = {k: v for k, v in alert_counts.items() if k in SAR_ALERT_KINDS}
    hazard_alert_counts = {k: v for k, v in alert_counts.items() if k in HAZARD_ALERT_KINDS}
    open_field_tasks = await list_open_sar_field_verifications(db, project_ids)
    scan_engine = await build_scan_engine_summary(db, user)

    return {
        **field_ops,
        "stale_satellite_work_areas": stale_satellite,
        "stale_sar_work_areas": sar_ops.get("stale_sar_work_areas", 0),
        "sar_at_risk_work_areas": sar_ops.get("sar_at_risk_work_areas", 0),
        "sar_aligned_work_areas": sar_ops.get("sar_aligned_work_areas", 0),
        "sar_divergent_work_areas": sar_ops.get("sar_divergent_work_areas", 0),
        "sar_gap_fill_work_areas": sar_ops.get("sar_gap_fill_work_areas", 0),
        "sar_live_providers": sar_ops.get("sar_live_providers", 0),
        "sar_stub_providers": sar_ops.get("sar_stub_providers", 0),
        "sar_avg_forest_integrity": sar_ops.get("sar_avg_forest_integrity"),
        "work_area_monitoring": work_area_rows[:100],
        "unread_alerts_by_kind": alert_counts,
        "unread_sar_alerts_by_kind": sar_alert_counts,
        "unread_hazard_alerts_by_kind": hazard_alert_counts,
        "scan_engine": scan_engine,
        "open_sar_field_verifications": open_field_tasks,
        "recent_jobs": await get_recent_job_runs(db, limit=10),
    }
