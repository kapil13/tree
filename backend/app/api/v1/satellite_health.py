"""Satellite NDVI → pest/disease AI health analysis."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.v1.deps import DB, CurrentUser
from app.api.v1.plantation_fences import _load_fence
from app.api.v1.satellite import _load_tree
from app.schemas.satellite_health import SatelliteHealthAnalysisOut
from app.services.ai.satellite_health_ops import (
    analyze_fence_satellite_health,
    analyze_tree_satellite_health,
    latest_fence_analysis,
    latest_tree_analysis,
)

router = APIRouter(prefix="/satellite-health", tags=["satellite-health"])


@router.post("/trees/{tree_id}", response_model=SatelliteHealthAnalysisOut)
async def analyze_tree(tree_id: uuid.UUID, user: CurrentUser, db: DB) -> SatelliteHealthAnalysisOut:
    tree = await _load_tree(tree_id, user, db)
    try:
        return await analyze_tree_satellite_health(
            db, tree.id, user.id, species_hint=tree.species_text
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/trees/{tree_id}/latest", response_model=SatelliteHealthAnalysisOut)
async def get_tree_latest(tree_id: uuid.UUID, user: CurrentUser, db: DB) -> SatelliteHealthAnalysisOut:
    await _load_tree(tree_id, user, db)
    out = await latest_tree_analysis(db, tree_id)
    if out is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="no_satellite_health_analysis")
    return out


@router.post("/plantation-fences/{fence_id}", response_model=SatelliteHealthAnalysisOut)
async def analyze_fence(
    fence_id: uuid.UUID, user: CurrentUser, db: DB
) -> SatelliteHealthAnalysisOut:
    fence = await _load_fence(fence_id, user, db)
    try:
        area = float(fence.area_ha) if fence.area_ha is not None else None
        return await analyze_fence_satellite_health(db, fence.id, user.id, area_ha=area)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/plantation-fences/{fence_id}/latest", response_model=SatelliteHealthAnalysisOut)
async def get_fence_latest(
    fence_id: uuid.UUID, user: CurrentUser, db: DB
) -> SatelliteHealthAnalysisOut:
    await _load_fence(fence_id, user, db)
    out = await latest_fence_analysis(db, fence_id)
    if out is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="no_satellite_health_analysis")
    return out
