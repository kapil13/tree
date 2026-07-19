"""Org-level field operations summary for supervisors."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.planting_projects.access import list_accessible_project_ids, project_list_filter
from app.services.planting_projects.service import project_summary
from app.services.planting_projects.survival_survey import survival_due_summary


async def build_field_ops_summary(db: AsyncSession, user) -> dict[str, Any]:
    stmt = select(PlantingProject).order_by(PlantingProject.created_at.desc())
    stmt = project_list_filter(user, stmt)
    projects = list((await db.execute(stmt)).scalars().all())

    total_open_violations = 0
    total_survival_due = 0
    total_trees = 0
    by_segment: dict[str, int] = {}
    project_rows: list[dict[str, Any]] = []
    violation_feed: list[dict[str, Any]] = []

    for project in projects:
        summary = await project_summary(db, project)
        survival = await survival_due_summary(db, project=project)
        open_v = int(summary.get("open_violations") or 0)
        due = int(survival.get("trees_due") or 0)
        trees = int(summary.get("tree_count") or 0)
        total_open_violations += open_v
        total_survival_due += due
        total_trees += trees
        by_segment[project.segment] = by_segment.get(project.segment, 0) + 1
        project_rows.append(
            {
                "id": str(project.id),
                "code": project.code,
                "name": project.name,
                "segment": project.segment,
                "compliance_mode": project.compliance_mode,
                "status": project.status,
                "open_violations": open_v,
                "survival_due": due,
                "tree_count": trees,
                "target_tree_count": project.target_tree_count,
                "progress_pct": summary.get("progress_pct"),
            }
        )

        if open_v:
            v_rows = (
                await db.execute(
                    select(PlantingComplianceViolation)
                    .where(
                        PlantingComplianceViolation.project_id == project.id,
                        PlantingComplianceViolation.resolved_at.is_(None),
                    )
                    .order_by(PlantingComplianceViolation.created_at.desc())
                    .limit(5)
                )
            ).scalars().all()
            for v in v_rows:
                violation_feed.append(
                    {
                        "id": str(v.id),
                        "project_id": str(project.id),
                        "project_code": project.code,
                        "project_name": project.name,
                        "segment": project.segment,
                        "violation_type": v.violation_type,
                        "severity": v.severity,
                        "message": v.message,
                        "tree_id": str(v.tree_id) if v.tree_id else None,
                        "created_at": v.created_at.isoformat() if v.created_at else None,
                    }
                )

    violation_feed.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    violation_feed = violation_feed[:25]

    accessible = await list_accessible_project_ids(user, db)
    if accessible is not None:
        tree_total_stmt = select(func.count()).where(
            Tree.project_id.in_(accessible),
            Tree.status != "removed",
        )
    else:
        tree_total_stmt = select(func.count()).where(Tree.status != "removed")
    total_trees = int((await db.execute(tree_total_stmt)).scalar_one() or 0)

    return {
        "project_count": len(projects),
        "tree_count": total_trees,
        "open_violations": total_open_violations,
        "survival_due": total_survival_due,
        "by_segment": by_segment,
        "projects": project_rows,
        "recent_violations": violation_feed,
    }
