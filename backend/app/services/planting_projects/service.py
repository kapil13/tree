"""Planting project service helpers."""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.planting_compliance_violation import PlantingComplianceViolation
from app.models.planting_project import PlantingProject
from app.models.planting_standard import PlantingStandard
from app.models.tree import Tree
from app.services.planting_projects.templates import get_template, template_for_segment


async def create_standard_from_template(
    db: AsyncSession,
    *,
    project: PlantingProject,
    template_code: str,
) -> PlantingStandard:
    tpl = get_template(template_code) or template_for_segment(project.segment)
    standard = PlantingStandard(
        project_id=project.id,
        template_code=tpl["code"],
        name=tpl["name"],
        is_template_snapshot=True,
        rules=dict(tpl["rules"]),
    )
    db.add(standard)
    await db.flush()
    return standard


async def get_active_standard(
    db: AsyncSession, project: PlantingProject
) -> PlantingStandard | None:
    res = await db.execute(
        select(PlantingStandard)
        .where(PlantingStandard.project_id == project.id)
        .order_by(PlantingStandard.created_at.desc())
        .limit(1)
    )
    return res.scalar_one_or_none()


async def project_summary(db: AsyncSession, project: PlantingProject) -> dict[str, Any]:
    work_area_count = int(
        (
            await db.execute(
                select(func.count()).where(PlantationFence.project_id == project.id)
            )
        ).scalar_one()
        or 0
    )
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
    open_violations = int(
        (
            await db.execute(
                select(func.count()).where(
                    PlantingComplianceViolation.project_id == project.id,
                    PlantingComplianceViolation.resolved_at.is_(None),
                )
            )
        ).scalar_one()
        or 0
    )

    return {
        "work_area_count": work_area_count,
        "tree_count": tree_count,
        "target_tree_count": project.target_tree_count,
        "open_violations": open_violations,
        "progress_pct": (
            round(100.0 * tree_count / project.target_tree_count, 1)
            if project.target_tree_count
            else None
        ),
    }
