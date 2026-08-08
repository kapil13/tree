"""SAR supervisor dashboard aggregates — Phase 3.3–3.6."""

from __future__ import annotations

import csv
import io
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.models.planting_project import PlantingProject
from app.services.monitoring.sar_field_tasks import FIELD_VERIFICATION_TYPE
from app.services.monitoring.sar_portfolio import sar_fence_snapshot
from app.services.planting_projects.access import project_list_filter


def sar_recommended_action(snap: dict[str, Any]) -> str:
    mode = snap.get("sar_monitoring_mode") or ""
    status = snap.get("sar_ground_status") or ""
    integrity = snap.get("sar_forest_integrity")
    if snap.get("sar_stale"):
        return "Run a SAR scan — last capture is older than 35 days."
    if mode == "optical_sar_divergent":
        return "Verify drainage on site; canopy looks green but SAR shows ground moisture risk."
    if status in {"wetland_risk", "hidden_moisture"}:
        return "Schedule field check for waterlogging or hidden moisture under canopy."
    if mode == "sar_gap_fill":
        return "Optical NDVI is stale; rely on SAR and schedule field verification after monsoon."
    if snap.get("sar_at_risk"):
        score = f"{integrity:.0f}" if integrity is not None else "low"
        return f"Forest Integrity at risk ({score}/100) — re-scan after field intervention."
    if integrity is not None and float(integrity) >= 65:
        return "Continue routine SAR monitoring."
    return "Run SAR scan to establish Forest Integrity baseline."


async def build_sar_ops_summary(
    db: AsyncSession,
    fences: list[PlantationFence],
) -> dict[str, Any]:
    aligned = divergent = gap_fill = at_risk = stale = stub_providers = live_providers = 0
    scores: list[float] = []
    rows: list[dict[str, Any]] = []

    for fence in fences:
        snap = await sar_fence_snapshot(db, fence.id)
        mode = snap.get("sar_monitoring_mode") or ""
        if mode == "aligned":
            aligned += 1
        elif mode == "optical_sar_divergent":
            divergent += 1
        elif mode == "sar_gap_fill":
            gap_fill += 1
        if snap.get("sar_at_risk"):
            at_risk += 1
        if snap.get("sar_stale"):
            stale += 1
        if snap.get("sar_live"):
            live_providers += 1
        elif snap.get("sar_provider"):
            stub_providers += 1
        if snap.get("sar_forest_integrity") is not None:
            scores.append(float(snap["sar_forest_integrity"]))
        rows.append(
            {
                "fence_id": str(fence.id),
                "fence_name": fence.name,
                "project_id": str(fence.project_id) if fence.project_id else None,
                **snap,
                "sar_recommended_action": sar_recommended_action(snap),
            }
        )

    return {
        "sar_aligned_work_areas": aligned,
        "sar_divergent_work_areas": divergent,
        "sar_gap_fill_work_areas": gap_fill,
        "sar_at_risk_work_areas": at_risk,
        "stale_sar_work_areas": stale,
        "sar_live_providers": live_providers,
        "sar_stub_providers": stub_providers,
        "sar_avg_forest_integrity": round(sum(scores) / len(scores), 1) if scores else None,
        "work_areas": rows,
    }


async def list_open_sar_field_verifications(
    db: AsyncSession,
    project_ids: list[uuid.UUID],
    *,
    limit: int = 25,
) -> list[dict[str, Any]]:
    if not project_ids:
        return []
    res = await db.execute(
        select(PlantingComplianceViolation, PlantationFence.name)
        .outerjoin(PlantationFence, PlantationFence.id == PlantingComplianceViolation.work_area_id)
        .where(
            PlantingComplianceViolation.project_id.in_(project_ids),
            PlantingComplianceViolation.violation_type == FIELD_VERIFICATION_TYPE,
            PlantingComplianceViolation.resolved_at.is_(None),
        )
        .order_by(PlantingComplianceViolation.created_at.desc())
        .limit(limit)
    )
    out: list[dict[str, Any]] = []
    for violation, fence_name in res.all():
        meta = violation.metadata_ or {}
        out.append(
            {
                "id": str(violation.id),
                "project_id": str(violation.project_id) if violation.project_id else None,
                "work_area_id": str(violation.work_area_id) if violation.work_area_id else None,
                "work_area_name": fence_name,
                "severity": violation.severity,
                "message": violation.message,
                "alert_kind": meta.get("alert_kind"),
                "forest_integrity_score": meta.get("forest_integrity_score"),
                "monitoring_mode": meta.get("monitoring_mode"),
                "created_at": violation.created_at.isoformat() if violation.created_at else None,
                "deep_link": (
                    f"/satellite?fence={violation.work_area_id}"
                    if violation.work_area_id
                    else None
                ),
            }
        )
    return out


async def build_sar_portfolio_export(db: AsyncSession, user) -> str:
    stmt = select(PlantingProject)
    stmt = project_list_filter(user, stmt)
    projects = list((await db.execute(stmt)).scalars().all())
    project_by_id = {p.id: p for p in projects}
    fences: list[PlantationFence] = []
    if projects:
        fences = list(
            (
                await db.execute(
                    select(PlantationFence).where(
                        PlantationFence.project_id.in_(project_by_id.keys())
                    )
                )
            ).scalars().all()
        )

    ops = await build_sar_ops_summary(db, fences)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "work_area_id",
            "work_area_name",
            "project_id",
            "project_name",
            "segment",
            "sar_forest_integrity",
            "sar_integrity_grade",
            "sar_monitoring_mode",
            "sar_ground_status",
            "sar_provider",
            "sar_live",
            "days_since_sar_scan",
            "sar_stale",
            "sar_at_risk",
            "recommended_action",
        ]
    )
    for row in ops["work_areas"]:
        project = project_by_id.get(uuid.UUID(row["project_id"])) if row.get("project_id") else None
        writer.writerow(
            [
                row.get("fence_id"),
                row.get("fence_name"),
                row.get("project_id"),
                project.name if project else "",
                project.segment if project else "",
                row.get("sar_forest_integrity"),
                row.get("sar_integrity_grade"),
                row.get("sar_monitoring_mode"),
                row.get("sar_ground_status"),
                row.get("sar_provider"),
                row.get("sar_live"),
                row.get("days_since_sar_scan"),
                row.get("sar_stale"),
                row.get("sar_at_risk"),
                row.get("sar_recommended_action"),
            ]
        )
    return buf.getvalue()
