"""Satellite monitoring endpoints."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from geoalchemy2.shape import to_shape
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.models.satellite import SatelliteRecord
from app.models.tree import Tree
from app.schemas.satellite import NDVIPoint, SatelliteRecordOut, SatelliteSeries
from app.services.satellite import get_satellite_service

router = APIRouter(prefix="/satellite", tags=["satellite"])


async def _load_tree(tree_id: uuid.UUID, user, db) -> Tree:
    res = await db.execute(select(Tree).where(Tree.id == tree_id))
    tree = res.scalar_one_or_none()
    if tree is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="tree_not_found")
    if user.role != "admin" and tree.owner_user_id != user.id and (
        not user.organization_id or tree.organization_id != user.organization_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    return tree


@router.post("/scan", response_model=SatelliteRecordOut)
async def scan(tree_id: uuid.UUID, user: CurrentUser, db: DB) -> SatelliteRecordOut:
    tree = await _load_tree(tree_id, user, db)
    pt = to_shape(tree.location)
    sample = await get_satellite_service().sample(pt.y, pt.x)
    rec = SatelliteRecord(
        tree_id=tree.id,
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
    )
    db.add(rec)
    tree.satellite_verified = bool(sample.presence_confirmed)
    tree.last_satellite_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(rec)
    return SatelliteRecordOut.model_validate(rec)


@router.get("-monitoring/{tree_id}", response_model=SatelliteSeries, name="series")
async def get_series(
    tree_id: uuid.UUID, user: CurrentUser, db: DB, months: int = 12
) -> SatelliteSeries:
    tree = await _load_tree(tree_id, user, db)
    res = await db.execute(
        select(SatelliteRecord)
        .where(SatelliteRecord.tree_id == tree.id)
        .order_by(SatelliteRecord.scene_acquired_at.desc())
        .limit(50)
    )
    stored = list(res.scalars().all())

    if not stored:
        pt = to_shape(tree.location)
        samples = await get_satellite_service().series(pt.y, pt.x, months=months)
        for s in samples:
            rec = SatelliteRecord(
                tree_id=tree.id,
                provider=s.provider,
                scene_id=s.scene_id,
                scene_acquired_at=s.scene_acquired_at,
                cloud_cover_pct=s.cloud_cover_pct,
                ndvi_mean=s.ndvi_mean,
                ndvi_max=s.ndvi_max,
                ndvi_min=s.ndvi_min,
                evi_mean=s.evi_mean,
                presence_confirmed=s.presence_confirmed,
                change_vs_baseline=s.change_vs_baseline,
            )
            db.add(rec)
            stored.append(rec)
        if samples:
            tree.satellite_verified = bool(samples[-1].presence_confirmed)
            tree.last_satellite_at = samples[-1].scene_acquired_at
        await db.commit()
        for r in stored:
            await db.refresh(r)

    points = [
        NDVIPoint(ts=r.scene_acquired_at, ndvi=float(r.ndvi_mean or 0), provider=r.provider)
        for r in sorted(stored, key=lambda x: x.scene_acquired_at)
    ]
    latest = max(stored, key=lambda x: x.scene_acquired_at) if stored else None
    return SatelliteSeries(
        tree_id=tree.id,
        points=points,
        latest=SatelliteRecordOut.model_validate(latest) if latest else None,
    )
