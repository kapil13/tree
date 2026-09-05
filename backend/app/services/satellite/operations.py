"""Persist satellite samples onto trees (shared by API + workers)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from geoalchemy2.shape import to_shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.satellite import SatelliteRecord
from app.models.tree import Tree
from app.services.satellite.service import SatelliteSample, get_satellite_service


def satellite_record_from_sample(tree_id: uuid.UUID, sample: SatelliteSample) -> SatelliteRecord:
    return SatelliteRecord(
        tree_id=tree_id,
        provider=sample.provider,
        scene_id=sample.scene_id,
        scene_acquired_at=sample.scene_acquired_at,
        cloud_cover_pct=sample.cloud_cover_pct,
        ndvi_mean=sample.ndvi_mean,
        ndvi_max=sample.ndvi_max,
        ndvi_min=sample.ndvi_min,
        evi_mean=sample.evi_mean,
        presence_confirmed=sample.presence_confirmed,
        change_vs_baseline=sample.change_vs_baseline,
        thumbnail_s3_key=sample.thumbnail_s3_key,
    )


async def apply_sample_to_tree(tree: Tree, sample: SatelliteSample) -> None:
    tree.satellite_verified = bool(sample.presence_confirmed)
    tree.last_satellite_at = sample.scene_acquired_at or datetime.now(UTC)


async def scan_tree(tree: Tree, db: AsyncSession) -> SatelliteRecord:
    pt = to_shape(tree.location)
    sample = await get_satellite_service().sample(pt.y, pt.x)
    rec = satellite_record_from_sample(tree.id, sample)
    await apply_sample_to_tree(tree, sample)
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec


async def scan_tree_by_id(tree_id: uuid.UUID, db: AsyncSession) -> SatelliteRecord | None:
    res = await db.execute(select(Tree).where(Tree.id == tree_id))
    tree = res.scalar_one_or_none()
    if tree is None:
        return None
    return await scan_tree(tree, db)
