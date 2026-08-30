"""Scope automated satellite sweeps to estate / satellite-watch projects only."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.planting_project import PlantingProject
from app.services.schemes.monitoring import is_satellite_watch_enabled


async def fetch_satellite_watch_project_ids(db: AsyncSession) -> set[uuid.UUID]:
    """Active/planning projects with estate scheme or satellite_watch_enabled opt-in."""
    res = await db.execute(
        select(PlantingProject).where(PlantingProject.status.in_(("active", "planning")))
    )
    return {p.id for p in res.scalars().all() if is_satellite_watch_enabled(p)}


async def fetch_satellite_watch_fences(db: AsyncSession) -> list[PlantationFence]:
    """Work areas belonging to satellite-watch-enabled projects."""
    project_ids = await fetch_satellite_watch_project_ids(db)
    if not project_ids:
        return []
    res = await db.execute(
        select(PlantationFence).where(PlantationFence.project_id.in_(project_ids))
    )
    return list(res.scalars().all())
