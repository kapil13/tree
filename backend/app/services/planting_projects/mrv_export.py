"""Build MRV / compliance export context for planting projects."""

from __future__ import annotations

import uuid
from typing import Any

from geoalchemy2.shape import to_shape
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.models.planting_project import PlantingProject
from app.models.plantation_fence import PlantationFence
from app.models.tree import Tree
from app.services.planting_projects.service import get_active_standard


async def build_project_mrv_context(
    db: AsyncSession, project: PlantingProject
) -> dict[str, Any]:
    standard = await get_active_standard(db, project)
    rules = standard.rules if standard else {}

    work_areas_res = await db.execute(
        select(PlantationFence)
        .where(PlantationFence.project_id == project.id)
        .order_by(PlantationFence.created_at.asc())
    )
    work_areas = list(work_areas_res.scalars().all())
    work_area_rows: list[dict[str, Any]] = []
    for fence in work_areas:
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
        work_area_rows.append(
            {
                "name": fence.name,
                "geometry_type": fence.geometry_type,
                "segment_code": fence.segment_code,
                "chainage_start_km": float(fence.chainage_start_km)
                if fence.chainage_start_km is not None
                else None,
                "chainage_end_km": float(fence.chainage_end_km)
                if fence.chainage_end_km is not None
                else None,
                "area_ha": float(fence.area_ha) if fence.area_ha is not None else None,
                "tree_count": tree_count,
            }
        )

    trees_res = await db.execute(
        select(Tree)
        .where(Tree.project_id == project.id, Tree.status != "removed")
        .order_by(Tree.created_at.asc())
        .limit(2000)
    )
    trees = list(trees_res.scalars().all())
    tree_rows: list[dict[str, Any]] = []
    survival_counts: dict[str, int] = {}
    native_count = 0
    for tree in trees:
        meta = tree.metadata_ or {}
        survival = str(meta.get("survival_status") or "unknown")
        survival_counts[survival] = survival_counts.get(survival, 0) + 1
        if meta.get("is_native") in (True, "true", "yes", "1"):
            native_count += 1
        pt = to_shape(tree.location)
        tree_rows.append(
            {
                "public_code": tree.public_code,
                "species": tree.species_text or "Unknown",
                "health": tree.current_health,
                "survival_status": survival,
                "chainage_km": meta.get("chainage_km"),
                "lat": round(pt.y, 6),
                "lon": round(pt.x, 6),
                "planted_at": tree.planted_at.isoformat() if tree.planted_at else None,
                "last_geotag_at": tree.last_geotag_at.isoformat()
                if tree.last_geotag_at
                else None,
            }
        )

    violations_res = await db.execute(
        select(PlantingComplianceViolation)
        .where(PlantingComplianceViolation.project_id == project.id)
        .order_by(PlantingComplianceViolation.created_at.desc())
        .limit(500)
    )
    violations = list(violations_res.scalars().all())
    open_violations = [v for v in violations if v.resolved_at is None]
    resolved_count = len(violations) - len(open_violations)

    violation_rows = [
        {
            "severity": v.severity,
            "violation_type": v.violation_type,
            "message": v.message,
            "tree_id": str(v.tree_id) if v.tree_id else None,
            "resolved": v.resolved_at is not None,
            "created_at": v.created_at.isoformat(),
        }
        for v in violations[:100]
    ]

    total_trees = len(trees)
    native_pct = round((native_count / total_trees) * 100, 1) if total_trees else None

    return {
        "project": {
            "code": project.code,
            "name": project.name,
            "segment": project.segment,
            "compliance_mode": project.compliance_mode,
            "status": project.status,
            "target_tree_count": project.target_tree_count,
            "standard_name": standard.name if standard else None,
            "standard_template": standard.template_code if standard else None,
        },
        "rules_summary": {
            "spacing_m": rules.get("spacing_m"),
            "min_photos": rules.get("min_photos"),
            "pit_size_cm": rules.get("pit_size_cm"),
            "native_species_min_pct": rules.get("native_species_min_pct"),
            "max_trees_per_ha": rules.get("max_trees_per_ha"),
            "min_trees_per_ha": rules.get("min_trees_per_ha"),
        },
        "summary": {
            "work_area_count": len(work_areas),
            "tree_count": total_trees,
            "open_violations": len(open_violations),
            "resolved_violations": resolved_count,
            "native_species_pct": native_pct,
            "survival_counts": survival_counts,
        },
        "work_areas": work_area_rows,
        "trees": tree_rows,
        "violations": violation_rows,
    }
