"""SAR / NISAR monitoring endpoints (L-band + S-band ground intelligence)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.v1.deps import DB, CurrentUser, WriteProfessional
from app.core.security import Permission, has_permission
from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.satellite import SatelliteRecord
from app.models.tree import Tree
from app.schemas.sar import SarAnalysisOut, SarMonitoringSeries, SarRecordOut, SarScanResponse, SarStatusOut
from app.services.data_scope import can_access_tree, user_sees_org_portfolio
from app.services.monitoring.sar_sweep import (
    latest_sar_record_for_fence,
    latest_sar_record_for_tree,
    scan_and_persist_fence_sar,
    scan_and_persist_tree_sar,
    serialize_sar_record,
)
from app.services.platform.governance import assert_org_feature_enabled
from app.services.satellite.sar_analytics import analysis_to_dict
from app.services.satellite.sar_service import get_sar_service, has_sar_credentials, is_sar_provider_record
from app.services.workers.enqueue import try_enqueue

router = APIRouter(prefix="/sar", tags=["sar"])


def _record_out(data: dict) -> SarRecordOut:
    analysis = data.get("analysis")
    return SarRecordOut(
        id=uuid.UUID(data["id"]),
        provider=data["provider"],
        scene_id=data["scene_id"],
        scene_acquired_at=data["scene_acquired_at"],
        l_band_hh_db=data.get("l_band_hh_db"),
        s_band_hh_db=data.get("s_band_hh_db"),
        double_bounce_index=data.get("double_bounce_index"),
        wetland_probability=data.get("wetland_probability"),
        ground_moisture_index=data.get("ground_moisture_index"),
        canopy_ground_mismatch=data.get("canopy_ground_mismatch"),
        frequency_bands=data.get("frequency_bands") or [],
        polarimetric_composite=data.get("polarimetric_composite"),
        coherence=data.get("coherence"),
        analysis=SarAnalysisOut.model_validate(analysis) if analysis else None,
    )


async def _load_tree(tree_id: uuid.UUID, user, db) -> Tree:
    tree = await db.get(Tree, tree_id)
    if tree is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="tree_not_found")
    if not await can_access_tree(db, user, tree):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    return tree


def _can_access_fence(user, fence: PlantationFence) -> bool:
    if user.role == "admin":
        return True
    if fence.owner_user_id == user.id:
        return True
    if user_sees_org_portfolio(user) and user.organization_id:
        return fence.organization_id == user.organization_id
    return False


async def _load_fence(fence_id: uuid.UUID, user, db) -> PlantationFence:
    fence = await db.get(PlantationFence, fence_id)
    if fence is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="fence_not_found")
    if not _can_access_fence(user, fence):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    return fence


@router.get("/status", response_model=SarStatusOut)
async def sar_status(_user: CurrentUser) -> SarStatusOut:
    svc = get_sar_service()
    gee = has_sar_credentials()
    return SarStatusOut(
        configured=True,
        provider=svc.name,
        pipeline=getattr(svc, "name", "nisar-sar-stub"),
        gee_available=gee,
        message=(
            "SAR ground intelligence active (NISAR-inspired L/S-band stub). "
            "Configure GEE_SERVICE_ACCOUNT_JSON for live NISAR / Sentinel-1 processing."
            if not gee
            else "SAR service configured with GEE credentials."
        ),
    )


@router.post("/trees/{tree_id}/scan", response_model=SarScanResponse)
async def sar_scan_tree(tree_id: uuid.UUID, user: WriteProfessional, db: DB) -> SarScanResponse:
    await assert_org_feature_enabled(db, user, "satellite")
    if not has_permission(user.role, Permission.SATELLITE_TRIGGER):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    tree = await _load_tree(tree_id, user, db)
    result = await scan_and_persist_tree_sar(db, tree, notify_user=user)
    if result is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="sar_scan_failed")
    rec, analysis = result
    await db.commit()
    await db.refresh(rec)
    serialized = serialize_sar_record(rec)
    return SarScanResponse(
        tree_id=tree.id,
        record=_record_out(serialized),
        analysis=SarAnalysisOut.model_validate(analysis_to_dict(analysis)),
    )


@router.post("/trees/{tree_id}/scan/async", status_code=status.HTTP_202_ACCEPTED)
async def sar_scan_tree_async(tree_id: uuid.UUID, user: WriteProfessional, db: DB) -> dict:
    await assert_org_feature_enabled(db, user, "satellite")
    await _load_tree(tree_id, user, db)
    from app.workers.tasks import run_sar_scan

    task_id = try_enqueue(run_sar_scan, str(tree_id))
    if task_id:
        return {"tree_id": str(tree_id), "status": "queued", "celery_task_id": task_id}
    resp = await sar_scan_tree(tree_id, user, db)
    return {"tree_id": str(tree_id), "status": "completed", "ground_status": resp.analysis.ground_status, "synchronous": True}


@router.get("/trees/{tree_id}/monitoring", response_model=SarMonitoringSeries)
async def sar_tree_monitoring(tree_id: uuid.UUID, user: CurrentUser, db: DB) -> SarMonitoringSeries:
    await assert_org_feature_enabled(db, user, "satellite")
    tree = await _load_tree(tree_id, user, db)
    res = await db.execute(
        select(SatelliteRecord)
        .where(SatelliteRecord.tree_id == tree.id)
        .order_by(SatelliteRecord.scene_acquired_at.desc())
        .limit(24)
    )
    sar_rows = [r for r in res.scalars().all() if is_sar_provider_record(r.provider)]
    latest = sar_rows[0] if sar_rows else await latest_sar_record_for_tree(db, tree.id)
    if latest and latest not in sar_rows:
        sar_rows = [latest, *sar_rows]
    points = [_record_out(serialize_sar_record(r)) for r in reversed(sar_rows)]
    return SarMonitoringSeries(
        tree_id=tree.id,
        latest=points[-1] if points else None,
        points=points,
        sar_configured=True,
    )


@router.post("/work-areas/{fence_id}/scan", response_model=SarScanResponse)
async def sar_scan_fence(fence_id: uuid.UUID, user: WriteProfessional, db: DB) -> SarScanResponse:
    await assert_org_feature_enabled(db, user, "satellite")
    if not has_permission(user.role, Permission.SATELLITE_TRIGGER):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden")
    fence = await _load_fence(fence_id, user, db)
    result = await scan_and_persist_fence_sar(db, fence, notify_user_id=user.id)
    if result is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="sar_scan_failed")
    rec, analysis = result
    await db.commit()
    await db.refresh(rec)
    serialized = serialize_sar_record(rec)
    return SarScanResponse(
        fence_id=fence.id,
        record=_record_out(serialized),
        analysis=SarAnalysisOut.model_validate(analysis_to_dict(analysis)),
    )


@router.get("/work-areas/{fence_id}/monitoring", response_model=SarMonitoringSeries)
async def sar_fence_monitoring(fence_id: uuid.UUID, user: CurrentUser, db: DB) -> SarMonitoringSeries:
    await assert_org_feature_enabled(db, user, "satellite")
    fence = await _load_fence(fence_id, user, db)
    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id == fence.id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
        .limit(24)
    )
    sar_rows = [r for r in res.scalars().all() if is_sar_provider_record(r.provider)]
    latest = sar_rows[0] if sar_rows else await latest_sar_record_for_fence(db, fence.id)
    if latest and latest not in sar_rows:
        sar_rows = [latest, *sar_rows]
    points = [_record_out(serialize_sar_record(r)) for r in reversed(sar_rows)]
    return SarMonitoringSeries(
        fence_id=fence.id,
        latest=points[-1] if points else None,
        points=points,
        sar_configured=True,
    )
