"""Scheme KPI evaluation against registry targets."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.schemes.monitoring import is_monitoring_scheme, is_satellite_watch_enabled
from app.services.schemes.registry import get_scheme


def scan_coverage_metrics(
    fences: list[PlantationFence],
    *,
    max_days_since_scan: int,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Pure helper for work-area satellite scan coverage."""
    now = now or datetime.now(UTC)
    work_area_count = len(fences)
    if work_area_count == 0:
        return {
            "work_area_count": 0,
            "scanned_work_areas": 0,
            "scan_coverage_pct": 0.0,
            "max_days_since_scan_observed": None,
            "mean_ndvi": None,
        }

    scanned = 0
    max_days_observed = 0
    for fence in fences:
        if not fence.last_satellite_at:
            max_days_observed = max(max_days_observed, 999)
            continue
        last_at = fence.last_satellite_at
        if last_at.tzinfo is None:
            last_at = last_at.replace(tzinfo=UTC)
        days = (now - last_at).days
        max_days_observed = max(max_days_observed, days)
        if days <= max_days_since_scan:
            scanned += 1

    scan_coverage_pct = round(100 * scanned / work_area_count, 1)
    return {
        "work_area_count": work_area_count,
        "scanned_work_areas": scanned,
        "scan_coverage_pct": scan_coverage_pct,
        "max_days_since_scan_observed": None if max_days_observed >= 999 else max_days_observed,
        "mean_ndvi": None,
    }


async def _latest_ndvi_by_fence(
    db: AsyncSession, fence_ids: list[Any]
) -> dict[str, float]:
    if not fence_ids:
        return {}
    ndvi_by_fence: dict[str, float] = {}
    for fence_id in fence_ids:
        rec = (
            await db.execute(
                select(PlantationSatelliteRecord)
                .where(PlantationSatelliteRecord.fence_id == fence_id)
                .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if rec and rec.ndvi_mean is not None:
            ndvi_by_fence[str(fence_id)] = float(rec.ndvi_mean)
    return ndvi_by_fence


async def _sar_integrity_metrics(
    db: AsyncSession, project_id: Any, fence_ids: list[Any]
) -> dict[str, int]:
    """Count SAR-scored work areas and at-risk integrity grades for a project."""
    if not fence_ids:
        return {"sar_scored_areas": 0, "sar_at_risk_areas": 0}

    from app.models.plantation_satellite_record import PlantationSatelliteRecord
    from app.services.satellite.sar_service import is_sar_provider_record

    sar_res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id.in_(fence_ids))
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
    )
    sar_at_risk = 0
    sar_scored = 0
    seen_fences: set[str] = set()
    for rec in sar_res.scalars().all():
        fid = str(rec.fence_id)
        if fid in seen_fences or not is_sar_provider_record(rec.provider):
            continue
        seen_fences.add(fid)
        fusion = (rec.raw_metadata or {}).get("sar_fusion") or {}
        if fusion.get("forest_integrity_score") is not None:
            sar_scored += 1
        if fusion.get("integrity_grade") in {"at_risk", "critical"}:
            sar_at_risk += 1

    return {"sar_scored_areas": sar_scored, "sar_at_risk_areas": sar_at_risk}


async def _compute_satellite_watch_metrics(
    db: AsyncSession,
    project: PlantingProject,
    *,
    max_days_since_scan: int = 35,
) -> dict[str, Any]:
    """NDVI scan coverage and SAR integrity for any project with work areas."""
    fences = list(
        (
            await db.execute(
                select(PlantationFence).where(PlantationFence.project_id == project.id)
            )
        ).scalars().all()
    )
    coverage = scan_coverage_metrics(fences, max_days_since_scan=max_days_since_scan)
    ndvi_by_fence = await _latest_ndvi_by_fence(db, [f.id for f in fences])
    ndvi_values = list(ndvi_by_fence.values())
    mean_ndvi = round(sum(ndvi_values) / len(ndvi_values), 3) if ndvi_values else None
    sar = await _sar_integrity_metrics(db, project.id, [f.id for f in fences])
    return {
        "work_area_count": coverage["work_area_count"],
        "scanned_work_areas": coverage["scanned_work_areas"],
        "scan_coverage_pct": coverage["scan_coverage_pct"],
        "max_days_since_scan": coverage["max_days_since_scan_observed"],
        "mean_ndvi": mean_ndvi,
        "sar_scored_areas": sar["sar_scored_areas"],
        "sar_at_risk_areas": sar["sar_at_risk_areas"],
    }


async def _compute_estate_monitoring_kpis(
    db: AsyncSession,
    project: PlantingProject,
    scheme: dict[str, Any],
) -> dict[str, Any]:
    targets = dict(scheme.get("kpi_targets") or {})
    max_days = int(targets.get("max_days_since_scan") or 35)

    metrics = await _compute_satellite_watch_metrics(db, project, max_days_since_scan=max_days)
    coverage_work_areas = metrics["work_area_count"]
    metrics["tree_count"] = 0

    checks: dict[str, bool] = {}
    if "scan_coverage_pct_min" in targets and coverage_work_areas > 0:
        checks["scan_coverage"] = metrics["scan_coverage_pct"] >= float(
            targets["scan_coverage_pct_min"]
        )
    if coverage_work_areas > 0 and metrics["max_days_since_scan"] is not None:
        checks["scan_freshness"] = metrics["max_days_since_scan"] <= max_days
    if coverage_work_areas > 0:
        checks["sar_integrity"] = (
            metrics["sar_at_risk_areas"] == 0 and metrics["sar_scored_areas"] > 0
        )

    if coverage_work_areas == 0:
        overall = "not_started"
    elif not checks:
        overall = "not_configured"
    elif all(checks.values()):
        overall = "on_track"
    elif any(checks.values()):
        overall = "at_risk"
    else:
        overall = "off_track"

    return {
        "scheme_code": scheme["code"],
        "scheme_label": scheme["label"],
        "ministry": scheme["ministry"],
        "targets": targets,
        "metrics": metrics,
        "checks": checks,
        "status": overall,
        "monitoring_mode": True,
        "satellite_watch": True,
    }


async def compute_scheme_kpis(db: AsyncSession, project: PlantingProject) -> dict[str, Any]:
    scheme_code = getattr(project, "scheme_code", None)
    scheme = get_scheme(scheme_code) if scheme_code else None
    if scheme is None:
        return {"scheme_code": None, "targets": {}, "metrics": {}, "status": "not_applicable"}

    if is_monitoring_scheme(scheme_code):
        return await _compute_estate_monitoring_kpis(db, project, scheme)

    trees_res = await db.execute(
        select(Tree).where(Tree.project_id == project.id, Tree.status != "removed")
    )
    trees = list(trees_res.scalars().all())
    tree_count = len(trees)
    geo_tagged = sum(1 for t in trees if t.last_geotag_at is not None)
    survival_ok = sum(
        1
        for t in trees
        if str((t.metadata_ or {}).get("survival_status", "unknown")).lower()
        in ("alive", "healthy", "surviving")
    )

    survival_pct = round(100 * survival_ok / tree_count, 1) if tree_count else 0.0
    geo_pct = round(100 * geo_tagged / tree_count, 1) if tree_count else 0.0

    targets = dict(scheme.get("kpi_targets") or {})
    metrics = {
        "tree_count": tree_count,
        "survival_pct": survival_pct,
        "geo_tagged_pct": geo_pct,
    }

    checks: dict[str, bool] = {}
    if "survival_pct_min" in targets:
        checks["survival"] = survival_pct >= float(targets["survival_pct_min"])
    if "geo_tagged_pct_min" in targets:
        checks["geo_tagged"] = geo_pct >= float(targets["geo_tagged_pct_min"])
    if "min_trees" in targets:
        checks["min_trees"] = tree_count >= int(targets["min_trees"])

    if not checks:
        overall = "not_configured"
    elif all(checks.values()):
        overall = "on_track"
    elif any(checks.values()):
        overall = "at_risk"
    else:
        overall = "off_track"

    result = {
        "scheme_code": scheme["code"],
        "scheme_label": scheme["label"],
        "ministry": scheme["ministry"],
        "targets": targets,
        "metrics": metrics,
        "checks": checks,
        "status": overall,
    }

    if is_satellite_watch_enabled(project):
        watch = await _compute_satellite_watch_metrics(db, project)
        result["metrics"] = {**result["metrics"], **watch}
        result["satellite_watch"] = True
        if watch["work_area_count"] > 0:
            result["checks"] = {
                **result["checks"],
                "scan_coverage": watch["scan_coverage_pct"] >= 80,
            }
            if watch["max_days_since_scan"] is not None:
                result["checks"]["scan_freshness"] = watch["max_days_since_scan"] <= 35

    return result
