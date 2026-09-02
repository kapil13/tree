"""Bulk integrity refresh for all trees in a planting project."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tree import Tree
from app.services.integrity.credit_gating import project_fusion_stats
from app.services.integrity.refresh import refresh_tree_integrity


async def refresh_project_integrity(
    db: AsyncSession,
    project_id: uuid.UUID,
) -> dict:
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
    return stats
