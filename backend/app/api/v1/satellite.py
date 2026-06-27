"""Satellite monitoring endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status
from geoalchemy2.shape import to_shape
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser
from app.models.satellite import SatelliteRecord
from app.models.tree import Tree
from app.schemas.satellite import NDVIPoint, SatelliteRecordOut, SatelliteSeries
from app.services.satellite import get_satellite_service
from app.services.satellite.operations import (
    apply_sample_to_tree,
    scan_tree,
    satellite_record_from_sample,
)

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
    try:
        rec = await scan_tree(tree, db)
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
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
        try:
            samples = await get_satellite_service().series(pt.y, pt.x, months=months)
        except RuntimeError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
        for s in samples:
            rec = satellite_record_from_sample(tree.id, s)
            db.add(rec)
            stored.append(rec)
        if samples:
            await apply_sample_to_tree(tree, samples[-1])
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
