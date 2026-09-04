"""Bulk integrity refresh for all trees in a planting project."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.planting_project import PlantingProject
from app.models.tree import Tree
from app.models.tree_risk_score import TreeRiskScore
from app.services.integrity.credit_gating import project_fusion_stats
from app.services.integrity.refresh import refresh_tree_integrity


async def refresh_project_integrity(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> dict[str, Any]:
    res = await db.execute(
        select(Tree).where(Tree.project_id == project_id, Tree.status != "removed")
    )
    trees = list(res.scalars().all())
    refreshed = 0
    for tree in trees:
        await refresh_tree_integrity(db, tree)
        refreshed += 1
    stats = await project_fusion_stats(db, project_id)
    stats["refreshed_count"] = refreshed
    stats["project_id"] = str(project_id)
    return stats


async def project_ids_needing_integrity_refresh(
    db: AsyncSession,
    *,
    limit: int | None = None,
    organization_id: uuid.UUID | None = None,
) -> list[uuid.UUID]:
    """Projects with at least one active tree missing a fusion score."""
    stmt = (
        select(Tree.project_id)
        .outerjoin(TreeRiskScore, TreeRiskScore.tree_id == Tree.id)
        .join(PlantingProject, PlantingProject.id == Tree.project_id)
        .where(
            Tree.project_id.is_not(None),
            Tree.status != "removed",
            TreeRiskScore.fusion_score.is_(None),
        )
        .group_by(Tree.project_id)
        .order_by(func.min(Tree.registered_at).asc())
    )
    if organization_id is not None:
        stmt = stmt.where(PlantingProject.organization_id == organization_id)
    if limit is not None:
        stmt = stmt.limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return [pid for pid in rows if pid is not None]


async def backfill_integrity_fusion(
    db: AsyncSession,
    *,
    project_ids: list[uuid.UUID] | None = None,
    limit_projects: int | None = None,
    organization_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    if project_ids is None:
        project_ids = await project_ids_needing_integrity_refresh(
            db,
            limit=limit_projects,
            organization_id=organization_id,
        )
    elif limit_projects is not None:
        project_ids = project_ids[:limit_projects]

    project_summaries: list[dict[str, Any]] = []
    trees_refreshed = 0
    for project_id in project_ids:
        summary = await refresh_project_integrity(db, project_id)
        project_summaries.append(summary)
        trees_refreshed += int(summary.get("refreshed_count", 0))

    return {
        "projects_processed": len(project_summaries),
        "trees_refreshed": trees_refreshed,
        "projects": project_summaries,
    }


async def maybe_refresh_integrity_before_ledger(
    db: AsyncSession,
    project: PlantingProject,
    *,
    refresh_integrity: bool = True,
) -> dict[str, Any] | None:
    if not refresh_integrity:
        return None
    return await refresh_project_integrity(db, project.id)
