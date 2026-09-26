"""Platform-wide scheme rollup for ops dashboards."""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.services.schemes.registry import get_scheme, list_schemes


async def build_platform_scheme_summary(db: AsyncSession) -> dict[str, Any]:
    """Aggregate planting projects and trees by central scheme."""
    schemes = list_schemes(active_only=True)
    scheme_index = {s["code"]: s for s in schemes}

    rows = (
        await db.execute(
            select(
                PlantingProject.scheme_code,
                func.count(PlantingProject.id),
            )
            .where(PlantingProject.scheme_code.isnot(None))
            .group_by(PlantingProject.scheme_code)
        )
    ).all()

    by_scheme: list[dict[str, Any]] = []
    total_projects = 0
    for scheme_code, project_count in rows:
        if not scheme_code:
            continue
        scheme = scheme_index.get(scheme_code) or get_scheme(scheme_code)
        tree_count = int(
            (
                await db.execute(
                    select(func.count())
                    .select_from(Tree)
                    .join(PlantingProject, Tree.project_id == PlantingProject.id)
                    .where(
                        PlantingProject.scheme_code == scheme_code,
                        Tree.status != "removed",
                    )
                )
            ).scalar_one()
            or 0
        )
        total_projects += int(project_count)
        by_scheme.append(
            {
                "scheme_code": scheme_code,
                "scheme_label": scheme["label"] if scheme else scheme_code,
                "ministry": scheme["ministry"] if scheme else None,
                "project_count": int(project_count),
                "tree_count": tree_count,
                "kpi_targets": dict(scheme.get("kpi_targets") or {}) if scheme else {},
            }
        )

    by_scheme.sort(key=lambda row: (-row["project_count"], row["scheme_label"]))

    unscoped_count = int(
        (
            await db.execute(
                select(func.count()).where(PlantingProject.scheme_code.is_(None))
            )
        ).scalar_one()
        or 0
    )

    return {
        "scheme_count": len(schemes),
        "tagged_project_count": total_projects,
        "untagged_project_count": unscoped_count,
        "by_scheme": by_scheme,
    }
