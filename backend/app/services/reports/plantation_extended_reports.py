"""Extended operational plantation reports (species, work areas, KPIs, etc.)."""

from __future__ import annotations

import uuid
from collections import defaultdict
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from geoalchemy2.functions import ST_Contains
from shapely.geometry import mapping
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.models.tree_image import TreeImage
from app.models.user import User
from app.services.data_scope import apply_tree_scope
from app.services.planting_projects.survival_survey import survey_interval_days
from app.services.reports.plantation_reports import (
    EXPORT_ROW_CAP,
    ExportFormat,
    _load_accessible_projects,
    _match_project_filters,
    project_location_meta,
    render_table_pdf,
    render_table_xlsx,
)
from app.services.satellite.sar_service import is_sar_provider_record
from app.services.schemes.kpis import compute_scheme_kpis
from app.services.schemes.registry import get_scheme
from app.services.storage import get_storage

HEALTH_SCORE = {"good": 3.0, "fair": 2.0, "poor": 1.0, "unknown": 0.0}
SURVIVAL_LIVE = frozenset({"live", "alive", "healthy", "surviving"})
SURVIVAL_STRESSED = frozenset({"stressed", "fair"})
SURVIVAL_DEAD = frozenset({"dead"})
SURVIVAL_REPLACED = frozenset({"replaced"})


def _health_score(health: str | None) -> float:
    return HEALTH_SCORE.get((health or "unknown").lower(), 0.0)


def _survival_bucket(status: str) -> str:
    s = status.lower()
    if s in SURVIVAL_LIVE:
        return "live"
    if s in SURVIVAL_STRESSED:
        return "stressed"
    if s in SURVIVAL_DEAD:
        return "dead"
    if s in SURVIVAL_REPLACED:
        return "replaced"
    return "unknown"


def _report_envelope(report: str, filters: dict[str, Any], items: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "report": report,
        "generated_at": datetime.now(UTC).isoformat(),
        "filters": filters,
        "items": items,
        "total": len(items),
    }


def _filter_projects(
    projects: list[PlantingProject],
    *,
    financial_year: str | None = None,
    state_code: str | None = None,
    district_code: str | None = None,
    segment: str | None = None,
    scheme_code: str | None = None,
    status: str | None = None,
    project_id: uuid.UUID | None = None,
) -> list[PlantingProject]:
    out: list[PlantingProject] = []
    for project in projects:
        if project_id and project.id != project_id:
            continue
        loc = project_location_meta(project)
        if _match_project_filters(
            project,
            loc,
            financial_year=financial_year,
            state_code=state_code,
            district_code=district_code,
            segment=segment,
            scheme_code=scheme_code,
            status=status,
        ):
            out.append(project)
    return out


async def _scoped_trees(
    db: AsyncSession,
    user,
    project_ids: set[uuid.UUID],
) -> list[Tree]:
    if not project_ids:
        return []
    stmt = await apply_tree_scope(
        select(Tree).where(Tree.status != "removed", Tree.project_id.in_(project_ids)),
        user,
        db,
    )
    return list((await db.execute(stmt)).scalars().all())


async def build_species_wise_report(
    db: AsyncSession,
    user,
    *,
    project_id: uuid.UUID | None = None,
    financial_year: str | None = None,
    state_code: str | None = None,
) -> dict[str, Any]:
    projects = _filter_projects(
        await _load_accessible_projects(db, user),
        project_id=project_id,
        financial_year=financial_year,
        state_code=state_code,
    )
    trees = await _scoped_trees(db, user, {p.id for p in projects})
    buckets: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"count": 0, "health_sum": 0.0, "carbon_kg": 0.0}
    )
    for tree in trees:
        species = (tree.species_text or "Unknown").strip() or "Unknown"
        b = buckets[species]
        b["count"] += 1
        b["health_sum"] += _health_score(tree.current_health)
        b["carbon_kg"] += float(tree.current_carbon_kg or 0)
    total = len(trees) or 1
    items = []
    for species, b in sorted(buckets.items(), key=lambda x: (-x[1]["count"], x[0])):
        count = b["count"]
        items.append(
            {
                "species": species,
                "count": count,
                "pct_of_total": round(100 * count / total, 1),
                "avg_health_score": round(b["health_sum"] / count, 2),
                "total_carbon_kg": round(b["carbon_kg"], 2),
                "total_co2e_t": round(b["carbon_kg"] * 44 / 12 / 1000, 3),
            }
        )
    return _report_envelope(
        "species_wise",
        {
            "project_id": str(project_id) if project_id else None,
            "financial_year": financial_year,
            "state_code": state_code,
        },
        items[:EXPORT_ROW_CAP],
    )


async def _latest_optical_record(
    db: AsyncSession, fence_id: uuid.UUID
) -> PlantationSatelliteRecord | None:
    rows = (
        await db.execute(
            select(PlantationSatelliteRecord)
            .where(PlantationSatelliteRecord.fence_id == fence_id)
            .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
            .limit(20)
        )
    ).scalars().all()
    for rec in rows:
        if not is_sar_provider_record(rec.provider):
            return rec
    return None


async def build_work_area_site_report(
    db: AsyncSession,
    user,
    *,
    project_id: uuid.UUID | None = None,
    financial_year: str | None = None,
    state_code: str | None = None,
) -> dict[str, Any]:
    projects = _filter_projects(
        await _load_accessible_projects(db, user),
        project_id=project_id,
        financial_year=financial_year,
        state_code=state_code,
    )
    project_map = {p.id: p for p in projects}
    items: list[dict[str, Any]] = []
    for pid in project_map:
        fences = list(
            (
                await db.execute(
                    select(PlantationFence).where(PlantationFence.project_id == pid)
                )
            ).scalars().all()
        )
        for fence in fences:
            tree_count = int(
                (
                    await db.execute(
                        select(func.count()).where(
                            Tree.plantation_id == fence.id,
                            Tree.status != "removed",
                        )
                    )
                ).scalar_one()
                or 0
            )
            area_ha = float(fence.area_ha or 0)
            density = round(tree_count / area_ha, 1) if area_ha > 0 else None
            optical = await _latest_optical_record(db, fence.id)
            sar_alert = False
            sar_rows = (
                await db.execute(
                    select(PlantationSatelliteRecord)
                    .where(PlantationSatelliteRecord.fence_id == fence.id)
                    .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
                    .limit(5)
                )
            ).scalars().all()
            for rec in sar_rows:
                if is_sar_provider_record(rec.provider):
                    grade = ((rec.raw_metadata or {}).get("sar_fusion") or {}).get("integrity_grade")
                    if grade in {"at_risk", "critical"}:
                        sar_alert = True
                    break
            project = project_map[pid]
            loc = project_location_meta(project)
            items.append(
                {
                    "work_area_id": str(fence.id),
                    "work_area_name": fence.name,
                    "project_code": project.code,
                    "project_name": project.name,
                    "state_name": loc["state_name"],
                    "district_name": loc["district_name"],
                    "area_ha": area_ha or None,
                    "tree_count": tree_count,
                    "tree_density_per_ha": density,
                    "ndvi_mean": float(optical.ndvi_mean) if optical and optical.ndvi_mean else None,
                    "ndvi_change_vs_baseline": float(optical.change_vs_baseline)
                    if optical and optical.change_vs_baseline is not None
                    else None,
                    "sar_alert": sar_alert,
                    "last_scan_at": (
                        optical.scene_acquired_at.isoformat()
                        if optical
                        else (fence.last_satellite_at.isoformat() if fence.last_satellite_at else "")
                    ),
                }
            )
            if len(items) >= EXPORT_ROW_CAP:
                break
        if len(items) >= EXPORT_ROW_CAP:
            break
    return _report_envelope(
        "work_area_site",
        {
            "project_id": str(project_id) if project_id else None,
            "financial_year": financial_year,
            "state_code": state_code,
        },
        items,
    )


async def build_survival_mortality_report(
    db: AsyncSession,
    user,
    *,
    project_id: uuid.UUID | None = None,
    financial_year: str | None = None,
    scheme_code: str | None = None,
) -> dict[str, Any]:
    projects = _filter_projects(
        await _load_accessible_projects(db, user),
        project_id=project_id,
        financial_year=financial_year,
        scheme_code=scheme_code,
    )
    items: list[dict[str, Any]] = []
    for project in projects:
        trees = await _scoped_trees(db, user, {project.id})
        counts = {"live": 0, "stressed": 0, "dead": 0, "replaced": 0, "unknown": 0}
        for tree in trees:
            meta = tree.metadata_ or {}
            status = meta.get("survival_status") if isinstance(meta.get("survival_status"), str) else ""
            bucket = _survival_bucket(status)
            counts[bucket] = counts.get(bucket, 0) + 1
        total = len(trees)
        dead = counts["dead"]
        mortality_pct = round(100 * dead / total, 1) if total else 0.0
        replacement_needed = counts["dead"] + counts["stressed"]
        loc = project_location_meta(project)
        scheme = get_scheme(project.scheme_code) if project.scheme_code else None
        target_survival = (scheme or {}).get("kpi_targets", {}).get("survival_pct_min")
        items.append(
            {
                "project_id": str(project.id),
                "project_code": project.code,
                "project_name": project.name,
                "financial_year": loc["financial_year"] or "Unassigned",
                "scheme_code": project.scheme_code or "",
                "total_trees": total,
                "live_count": counts["live"],
                "stressed_count": counts["stressed"],
                "dead_count": counts["dead"],
                "replaced_count": counts["replaced"],
                "unknown_count": counts["unknown"],
                "mortality_pct": mortality_pct,
                "replacement_needed": replacement_needed,
                "scheme_survival_target_pct": target_survival,
            }
        )
    return _report_envelope(
        "survival_mortality",
        {
            "project_id": str(project_id) if project_id else None,
            "financial_year": financial_year,
            "scheme_code": scheme_code,
        },
        items,
    )


async def build_compliance_violations_report(
    db: AsyncSession,
    user,
    *,
    project_id: uuid.UUID | None = None,
    resolved: bool | None = None,
    severity: str | None = None,
) -> dict[str, Any]:
    projects = await _load_accessible_projects(db, user)
    allowed_ids = {p.id for p in projects}
    if project_id:
        allowed_ids = allowed_ids & {project_id}
    if not allowed_ids:
        return _report_envelope("compliance_violations", {"project_id": str(project_id) if project_id else None}, [])

    stmt = (
        select(PlantingComplianceViolation, PlantingProject, PlantationFence, Tree)
        .outerjoin(PlantingProject, PlantingComplianceViolation.project_id == PlantingProject.id)
        .outerjoin(PlantationFence, PlantingComplianceViolation.work_area_id == PlantationFence.id)
        .outerjoin(Tree, PlantingComplianceViolation.tree_id == Tree.id)
        .where(PlantingComplianceViolation.project_id.in_(allowed_ids))
        .order_by(PlantingComplianceViolation.created_at.desc())
        .limit(EXPORT_ROW_CAP)
    )
    if resolved is True:
        stmt = stmt.where(PlantingComplianceViolation.resolved_at.isnot(None))
    elif resolved is False:
        stmt = stmt.where(PlantingComplianceViolation.resolved_at.is_(None))
    if severity:
        stmt = stmt.where(PlantingComplianceViolation.severity == severity)

    rows = (await db.execute(stmt)).all()
    items: list[dict[str, Any]] = []
    for violation, project, work_area, tree in rows:
        items.append(
            {
                "violation_id": str(violation.id),
                "violation_type": violation.violation_type,
                "severity": violation.severity,
                "message": violation.message,
                "project_code": project.code if project else "",
                "project_name": project.name if project else "",
                "work_area_name": work_area.name if work_area else "",
                "tree_code": tree.public_code if tree else "",
                "resolved": violation.resolved_at is not None,
                "resolved_at": violation.resolved_at.isoformat() if violation.resolved_at else "",
                "created_at": violation.created_at.isoformat() if violation.created_at else "",
            }
        )
    return _report_envelope(
        "compliance_violations",
        {
            "project_id": str(project_id) if project_id else None,
            "resolved": resolved,
            "severity": severity,
        },
        items,
    )


async def build_satellite_health_report(
    db: AsyncSession,
    user,
    *,
    project_id: uuid.UUID | None = None,
    financial_year: str | None = None,
) -> dict[str, Any]:
    ctx = await build_work_area_site_report(
        db,
        user,
        project_id=project_id,
        financial_year=financial_year,
    )
    items = []
    for row in ctx["items"]:
        alert_count = 1 if row.get("sar_alert") else 0
        if row.get("ndvi_change_vs_baseline") is not None and row["ndvi_change_vs_baseline"] < -0.1:
            alert_count += 1
        items.append(
            {
                "work_area_name": row["work_area_name"],
                "project_name": row["project_name"],
                "ndvi_mean": row.get("ndvi_mean"),
                "ndvi_change_vs_baseline": row.get("ndvi_change_vs_baseline"),
                "alert_count": alert_count,
                "last_scan_at": row.get("last_scan_at"),
                "sar_alert": row.get("sar_alert"),
            }
        )
    return _report_envelope(
        "satellite_health",
        ctx["filters"],
        items,
    )


async def build_scheme_kpi_report(
    db: AsyncSession,
    user,
    *,
    scheme_code: str | None = None,
    financial_year: str | None = None,
) -> dict[str, Any]:
    projects = _filter_projects(
        await _load_accessible_projects(db, user),
        scheme_code=scheme_code,
        financial_year=financial_year,
    )
    items: list[dict[str, Any]] = []
    for project in projects:
        if not project.scheme_code:
            continue
        kpis = await compute_scheme_kpis(db, project)
        if kpis.get("status") == "not_applicable":
            continue
        loc = project_location_meta(project)
        refs = (project.metadata_ or {}).get("scheme_refs") or {}
        metrics = kpis.get("metrics") or {}
        targets = kpis.get("targets") or {}
        items.append(
            {
                "project_code": project.code,
                "project_name": project.name,
                "scheme_code": kpis.get("scheme_code") or project.scheme_code,
                "scheme_label": kpis.get("scheme_label") or "",
                "financial_year": loc["financial_year"] or "Unassigned",
                "status": kpis.get("status"),
                "tree_count": metrics.get("tree_count"),
                "survival_pct": metrics.get("survival_pct"),
                "survival_target_pct": targets.get("survival_pct_min"),
                "geo_tagged_pct": metrics.get("geo_tagged_pct"),
                "geo_target_pct": targets.get("geo_tagged_pct_min"),
                "scan_coverage_pct": metrics.get("scan_coverage_pct"),
                "scan_target_pct": targets.get("scan_coverage_pct_min"),
                "scheme_ref_apo": refs.get("apo_number") or refs.get("state_campa_account") or "",
            }
        )
    return _report_envelope(
        "scheme_kpi",
        {"scheme_code": scheme_code, "financial_year": financial_year},
        items,
    )


async def build_field_team_performance_report(
    db: AsyncSession,
    user,
    *,
    project_id: uuid.UUID | None = None,
    financial_year: str | None = None,
) -> dict[str, Any]:
    projects = _filter_projects(
        await _load_accessible_projects(db, user),
        project_id=project_id,
        financial_year=financial_year,
    )
    trees = await _scoped_trees(db, user, {p.id for p in projects})
    now = datetime.now(UTC)
    by_user: dict[uuid.UUID, dict[str, Any]] = defaultdict(
        lambda: {"registered": 0, "regeotag_due": 0, "regeotag_current": 0}
    )
    project_interval: dict[uuid.UUID, int] = {}
    for project in projects:
        project_interval[project.id] = survey_interval_days(project)

    for tree in trees:
        uid = tree.owner_user_id
        by_user[uid]["registered"] += 1
        if tree.project_id:
            interval = project_interval.get(tree.project_id, 365)
            cutoff = now - timedelta(days=interval)
            last_at = tree.last_geotag_at or tree.registered_at
            if last_at and last_at <= cutoff:
                by_user[uid]["regeotag_due"] += 1
            else:
                by_user[uid]["regeotag_current"] += 1

    user_ids = list(by_user.keys())
    users = {}
    if user_ids:
        for u in (await db.execute(select(User).where(User.id.in_(user_ids)))).scalars().all():
            users[u.id] = u

    items: list[dict[str, Any]] = []
    for uid, stats in sorted(by_user.items(), key=lambda x: -x[1]["registered"]):
        registered = stats["registered"]
        due = stats["regeotag_due"]
        current = stats["regeotag_current"]
        total_geo = due + current
        completion_rate = round(100 * current / total_geo, 1) if total_geo else None
        u = users.get(uid)
        items.append(
            {
                "user_id": str(uid),
                "worker_name": u.full_name if u else "Unknown",
                "worker_email": u.email if u else "",
                "trees_registered": registered,
                "regeotag_due": due,
                "regeotag_current": current,
                "regeotag_completion_pct": completion_rate,
            }
        )
    return _report_envelope(
        "field_team_performance",
        {
            "project_id": str(project_id) if project_id else None,
            "financial_year": financial_year,
        },
        items[:EXPORT_ROW_CAP],
    )


async def build_carbon_stock_report(
    db: AsyncSession,
    user,
    *,
    financial_year: str | None = None,
    state_code: str | None = None,
    group_by: str = "project",
) -> dict[str, Any]:
    projects = _filter_projects(
        await _load_accessible_projects(db, user),
        financial_year=financial_year,
        state_code=state_code,
    )
    trees = await _scoped_trees(db, user, {p.id for p in projects})
    project_map = {p.id: p for p in projects}
    buckets: dict[str, dict[str, Any]] = defaultdict(lambda: {"carbon_kg": 0.0, "tree_count": 0})

    for tree in trees:
        if not tree.project_id:
            continue
        project = project_map.get(tree.project_id)
        if not project:
            continue
        loc = project_location_meta(project)
        if group_by == "fy":
            key = loc["financial_year"] or "Unassigned"
            label = key
        else:
            key = str(project.id)
            label = project.name
        b = buckets[key]
        b["label"] = label
        b["project_code"] = project.code
        b["financial_year"] = loc["financial_year"] or "Unassigned"
        b["state_name"] = loc["state_name"]
        b["carbon_kg"] += float(tree.current_carbon_kg or 0)
        b["tree_count"] += 1

    items = []
    for key, b in buckets.items():
        carbon_kg = b["carbon_kg"]
        tco2e = carbon_kg * 44 / 12 / 1000
        uncertainty_pct = 15.0
        items.append(
            {
                "group_key": key,
                "label": b.get("label"),
                "project_code": b.get("project_code", ""),
                "financial_year": b.get("financial_year", ""),
                "state_name": b.get("state_name", ""),
                "tree_count": b["tree_count"],
                "total_carbon_kg": round(carbon_kg, 2),
                "total_tco2e": round(tco2e, 3),
                "uncertainty_pct": uncertainty_pct,
                "tco2e_low": round(tco2e * (1 - uncertainty_pct / 100), 3),
                "tco2e_high": round(tco2e * (1 + uncertainty_pct / 100), 3),
            }
        )
    items.sort(key=lambda r: -(r.get("total_tco2e") or 0))
    return _report_envelope(
        "carbon_stock",
        {"financial_year": financial_year, "state_code": state_code, "group_by": group_by},
        items,
    )


def _gps_match(tree: Tree, image: TreeImage) -> bool:
    if tree.location is None or image.taken_location is None:
        return False
    tree_pt = mapping(tree.location)["coordinates"]
    img_pt = mapping(image.taken_location)["coordinates"]
    if not tree_pt or not img_pt:
        return False
    dlat = abs(tree_pt[1] - img_pt[1])
    dlon = abs(tree_pt[0] - img_pt[0])
    return dlat < 0.0003 and dlon < 0.0003


async def build_photo_evidence_report(
    db: AsyncSession,
    user,
    *,
    project_id: uuid.UUID | None = None,
    financial_year: str | None = None,
) -> dict[str, Any]:
    projects = _filter_projects(
        await _load_accessible_projects(db, user),
        project_id=project_id,
        financial_year=financial_year,
    )
    trees = await _scoped_trees(db, user, {p.id for p in projects})
    tree_ids = [t.id for t in trees]
    if not tree_ids:
        return _report_envelope(
            "photo_evidence",
            {"project_id": str(project_id) if project_id else None, "financial_year": financial_year},
            [],
        )

    images = list(
        (
            await db.execute(
                select(TreeImage, Tree)
                .join(Tree, TreeImage.tree_id == Tree.id)
                .where(TreeImage.tree_id.in_(tree_ids))
                .order_by(TreeImage.created_at.desc())
                .limit(EXPORT_ROW_CAP)
            )
        ).all()
    )
    storage = get_storage()
    items: list[dict[str, Any]] = []
    for image, tree in images:
        url = image.cdn_url
        if not url:
            try:
                url = storage.presigned_get(image.s3_key, expires_in=3600)
            except Exception:
                url = image.s3_key
        pt = mapping(tree.location)["coordinates"] if tree.location else None
        items.append(
            {
                "tree_code": tree.public_code,
                "photo_url": url or "",
                "photo_date": (image.taken_at or image.created_at).isoformat()
                if (image.taken_at or image.created_at)
                else "",
                "is_primary": image.is_primary,
                "latitude": pt[1] if pt else None,
                "longitude": pt[0] if pt else None,
                "gps_match": _gps_match(tree, image),
            }
        )
    return _report_envelope(
        "photo_evidence",
        {"project_id": str(project_id) if project_id else None, "financial_year": financial_year},
        items,
    )


async def build_district_block_admin_report(
    db: AsyncSession,
    user,
    *,
    state_code: str | None = None,
    district_code: str | None = None,
    financial_year: str | None = None,
) -> dict[str, Any]:
    projects = _filter_projects(
        await _load_accessible_projects(db, user),
        state_code=state_code,
        district_code=district_code,
        financial_year=financial_year,
    )
    buckets: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "project_count": 0,
            "target_trees": 0,
            "registered_trees": 0,
        }
    )
    for project in projects:
        loc = project_location_meta(project)
        key = "|".join(
            [
                loc.get("state_code") or "",
                loc.get("state_name") or "",
                loc.get("district_code") or "",
                loc.get("district_name") or "",
                loc.get("block_name") or "",
            ]
        )
        b = buckets[key]
        b["state_code"] = loc.get("state_code") or ""
        b["state_name"] = loc.get("state_name") or ""
        b["district_code"] = loc.get("district_code") or ""
        b["district_name"] = loc.get("district_name") or ""
        b["block_name"] = loc.get("block_name") or ""
        b["project_count"] += 1
        b["target_trees"] += int(project.target_tree_count or 0)
        tree_count = int(
            (
                await db.execute(
                    select(func.count()).where(
                        Tree.project_id == project.id,
                        Tree.status != "removed",
                    )
                )
            ).scalar_one()
            or 0
        )
        b["registered_trees"] += tree_count

    items = []
    for b in buckets.values():
        target = b["target_trees"]
        registered = b["registered_trees"]
        b["gap"] = max(target - registered, 0)
        b["achievement_pct"] = round(100 * registered / target, 1) if target else None
        items.append(b)
    items.sort(key=lambda r: (r.get("state_name") or "", r.get("district_name") or "", r.get("block_name") or ""))
    return _report_envelope(
        "district_block_admin",
        {
            "state_code": state_code,
            "district_code": district_code,
            "financial_year": financial_year,
        },
        items,
    )


async def build_pending_registration_report(
    db: AsyncSession,
    user,
    *,
    financial_year: str | None = None,
    state_code: str | None = None,
    min_gap: int = 1,
) -> dict[str, Any]:
    from app.services.reports.plantation_reports import build_project_wise_report

    project_report = await build_project_wise_report(
        db,
        user,
        financial_year=financial_year,
        state_code=state_code,
    )
    items = []
    for row in project_report["items"]:
        target = int(row.get("target_tree_count") or 0)
        registered = int(row.get("registered_trees") or 0)
        gap = max(target - registered, 0)
        if gap < min_gap:
            continue
        items.append(
            {
                "project_id": row["project_id"],
                "project_code": row["project_code"],
                "project_name": row["project_name"],
                "financial_year": row["financial_year"],
                "state_name": row["state_name"],
                "district_name": row["district_name"],
                "target_trees": target,
                "registered_trees": registered,
                "pending_trees": gap,
                "progress_pct": row.get("progress_pct"),
            }
        )
    items.sort(key=lambda r: -int(r.get("pending_trees") or 0))
    return _report_envelope(
        "pending_registration",
        {"financial_year": financial_year, "state_code": state_code, "min_gap": min_gap},
        items,
    )


async def build_out_of_fence_report(
    db: AsyncSession,
    user,
    *,
    project_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    projects = _filter_projects(
        await _load_accessible_projects(db, user),
        project_id=project_id,
    )
    items: list[dict[str, Any]] = []
    for project in projects:
        stmt = (
            select(Tree, PlantationFence)
            .join(PlantationFence, Tree.plantation_id == PlantationFence.id)
            .where(
                Tree.project_id == project.id,
                Tree.status != "removed",
                ~ST_Contains(PlantationFence.boundary, Tree.location),
            )
            .limit(EXPORT_ROW_CAP - len(items))
        )
        stmt = await apply_tree_scope(stmt, user, db)
        rows = (await db.execute(stmt)).all()
        for tree, fence in rows:
            pt = mapping(tree.location)["coordinates"] if tree.location else None
            items.append(
                {
                    "tree_code": tree.public_code,
                    "project_code": project.code,
                    "project_name": project.name,
                    "work_area_name": fence.name,
                    "latitude": pt[1] if pt else None,
                    "longitude": pt[0] if pt else None,
                    "issue": "outside_work_area_boundary",
                }
            )
            if len(items) >= EXPORT_ROW_CAP:
                break
        if len(items) >= EXPORT_ROW_CAP:
            break
    return _report_envelope(
        "out_of_fence",
        {"project_id": str(project_id) if project_id else None},
        items,
    )


def _generic_export(
    ctx: dict[str, Any],
    fmt: ExportFormat,
    *,
    title: str,
    sheet_name: str,
    headers: list[str],
    row_fn: Callable[[dict[str, Any]], list[Any]],
    landscape_mode: bool = False,
) -> tuple[bytes, str, str]:
    rows = [row_fn(r) for r in ctx["items"]]
    subtitle = f"Generated {ctx['generated_at']} · {ctx['total']} rows"
    if fmt == "xlsx":
        return (
            render_table_xlsx(sheet_name=sheet_name, headers=headers, rows=rows),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xlsx",
        )
    return (
        render_table_pdf(
            title=title,
            subtitle=subtitle,
            headers=headers,
            rows=rows,
            landscape_mode=landscape_mode,
        ),
        "application/pdf",
        "pdf",
    )


def export_species_wise(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    return _generic_export(
        ctx,
        fmt,
        title="Species-wise Summary Report",
        sheet_name="Species",
        headers=["Species", "Count", "% of total", "Avg health", "Carbon kg", "tCO₂e"],
        row_fn=lambda r: [
            r["species"],
            r["count"],
            r["pct_of_total"],
            r["avg_health_score"],
            r["total_carbon_kg"],
            r["total_co2e_t"],
        ],
    )


def export_work_area_site(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    return _generic_export(
        ctx,
        fmt,
        title="Work Area / Site Report",
        sheet_name="Work areas",
        headers=[
            "Work area",
            "Project",
            "State",
            "District",
            "Area (ha)",
            "Trees",
            "Density/ha",
            "NDVI",
            "Δ baseline",
            "SAR alert",
            "Last scan",
        ],
        row_fn=lambda r: [
            r["work_area_name"],
            r["project_name"],
            r["state_name"],
            r["district_name"],
            r.get("area_ha"),
            r["tree_count"],
            r.get("tree_density_per_ha"),
            r.get("ndvi_mean"),
            r.get("ndvi_change_vs_baseline"),
            "Yes" if r.get("sar_alert") else "No",
            r.get("last_scan_at"),
        ],
        landscape_mode=True,
    )


def export_survival_mortality(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    return _generic_export(
        ctx,
        fmt,
        title="Survival & Mortality Report",
        sheet_name="Survival",
        headers=[
            "Project",
            "FY",
            "Scheme",
            "Total",
            "Live",
            "Stressed",
            "Dead",
            "Replaced",
            "Mortality %",
            "Replacement needed",
            "Scheme target %",
        ],
        row_fn=lambda r: [
            r["project_name"],
            r["financial_year"],
            r["scheme_code"],
            r["total_trees"],
            r["live_count"],
            r["stressed_count"],
            r["dead_count"],
            r["replaced_count"],
            r["mortality_pct"],
            r["replacement_needed"],
            r.get("scheme_survival_target_pct"),
        ],
        landscape_mode=True,
    )


def export_compliance_violations(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    return _generic_export(
        ctx,
        fmt,
        title="Compliance Violations Report",
        sheet_name="Violations",
        headers=[
            "Type",
            "Severity",
            "Project",
            "Work area",
            "Tree",
            "Resolved",
            "Message",
            "Created",
        ],
        row_fn=lambda r: [
            r["violation_type"],
            r["severity"],
            r["project_name"],
            r["work_area_name"],
            r["tree_code"],
            "Yes" if r["resolved"] else "No",
            (r["message"] or "")[:120],
            r.get("created_at"),
        ],
        landscape_mode=True,
    )


def export_satellite_health(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    return _generic_export(
        ctx,
        fmt,
        title="Satellite Health Report",
        sheet_name="Satellite",
        headers=["Work area", "Project", "NDVI mean", "Δ baseline", "Alerts", "Last scan", "SAR alert"],
        row_fn=lambda r: [
            r["work_area_name"],
            r["project_name"],
            r.get("ndvi_mean"),
            r.get("ndvi_change_vs_baseline"),
            r.get("alert_count"),
            r.get("last_scan_at"),
            "Yes" if r.get("sar_alert") else "No",
        ],
        landscape_mode=True,
    )


def export_scheme_kpi(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    return _generic_export(
        ctx,
        fmt,
        title="Scheme KPI Report",
        sheet_name="Scheme KPI",
        headers=[
            "Project",
            "Scheme",
            "FY",
            "Status",
            "Trees",
            "Survival %",
            "Target %",
            "Geo-tag %",
            "Scan %",
            "Scheme ref",
        ],
        row_fn=lambda r: [
            r["project_name"],
            r["scheme_label"] or r["scheme_code"],
            r["financial_year"],
            r["status"],
            r.get("tree_count"),
            r.get("survival_pct"),
            r.get("survival_target_pct"),
            r.get("geo_tagged_pct"),
            r.get("scan_coverage_pct"),
            r.get("scheme_ref_apo"),
        ],
        landscape_mode=True,
    )


def export_field_team_performance(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    return _generic_export(
        ctx,
        fmt,
        title="Field Team Performance Report",
        sheet_name="Field team",
        headers=[
            "Worker",
            "Email",
            "Trees registered",
            "Re-geotag due",
            "Re-geotag current",
            "Completion %",
        ],
        row_fn=lambda r: [
            r["worker_name"],
            r["worker_email"],
            r["trees_registered"],
            r["regeotag_due"],
            r["regeotag_current"],
            r.get("regeotag_completion_pct"),
        ],
        landscape_mode=True,
    )


def export_carbon_stock(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    return _generic_export(
        ctx,
        fmt,
        title="Carbon Stock Report",
        sheet_name="Carbon",
        headers=[
            "Label",
            "Project",
            "FY",
            "State",
            "Trees",
            "tCO₂e",
            "Uncertainty %",
            "Low",
            "High",
        ],
        row_fn=lambda r: [
            r.get("label"),
            r.get("project_code"),
            r.get("financial_year"),
            r.get("state_name"),
            r.get("tree_count"),
            r.get("total_tco2e"),
            r.get("uncertainty_pct"),
            r.get("tco2e_low"),
            r.get("tco2e_high"),
        ],
        landscape_mode=True,
    )


def export_photo_evidence(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    return _generic_export(
        ctx,
        fmt,
        title="Photo Evidence Pack",
        sheet_name="Photos",
        headers=["Tree code", "Photo URL", "Date", "Primary", "Lat", "Lon", "GPS match"],
        row_fn=lambda r: [
            r["tree_code"],
            r["photo_url"],
            r.get("photo_date"),
            "Yes" if r.get("is_primary") else "No",
            r.get("latitude"),
            r.get("longitude"),
            "Yes" if r.get("gps_match") else "No",
        ],
        landscape_mode=True,
    )


def export_district_block_admin(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    return _generic_export(
        ctx,
        fmt,
        title="District / Block Admin Report",
        sheet_name="Admin",
        headers=[
            "State",
            "District",
            "Block",
            "Projects",
            "Target",
            "Registered",
            "Gap",
            "Achievement %",
        ],
        row_fn=lambda r: [
            r.get("state_name"),
            r.get("district_name"),
            r.get("block_name"),
            r.get("project_count"),
            r.get("target_trees"),
            r.get("registered_trees"),
            r.get("gap"),
            r.get("achievement_pct"),
        ],
        landscape_mode=True,
    )


def export_pending_registration(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    return _generic_export(
        ctx,
        fmt,
        title="Pending Registration Report",
        sheet_name="Pending",
        headers=[
            "Project",
            "FY",
            "State",
            "District",
            "Target",
            "Registered",
            "Pending",
            "Progress %",
        ],
        row_fn=lambda r: [
            r["project_name"],
            r["financial_year"],
            r.get("state_name"),
            r.get("district_name"),
            r.get("target_trees"),
            r.get("registered_trees"),
            r.get("pending_trees"),
            r.get("progress_pct"),
        ],
        landscape_mode=True,
    )


def export_out_of_fence(ctx: dict[str, Any], fmt: ExportFormat) -> tuple[bytes, str, str]:
    return _generic_export(
        ctx,
        fmt,
        title="Out-of-Fence Trees Report",
        sheet_name="Out of fence",
        headers=["Tree code", "Project", "Work area", "Latitude", "Longitude", "Issue"],
        row_fn=lambda r: [
            r["tree_code"],
            r["project_name"],
            r["work_area_name"],
            r.get("latitude"),
            r.get("longitude"),
            r.get("issue"),
        ],
        landscape_mode=True,
    )
