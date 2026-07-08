"""Persist and load satellite NDVI health analyses."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.satellite import SatelliteRecord
from app.models.satellite_health_analysis import SatelliteHealthAnalysis
from app.schemas.satellite_health import SatelliteHealthAnalysisOut
from app.services.ai.satellite_health import analyze_satellite_ndvi_health
from app.services.ai.satellite_health_types import NdviObservation


def _record_to_obs_tree(rec: SatelliteRecord) -> NdviObservation:
    return NdviObservation(
        scene_acquired_at=rec.scene_acquired_at,
        ndvi_mean=float(rec.ndvi_mean or 0),
        ndvi_min=float(rec.ndvi_min) if rec.ndvi_min is not None else None,
        ndvi_max=float(rec.ndvi_max) if rec.ndvi_max is not None else None,
        evi_mean=float(rec.evi_mean) if rec.evi_mean is not None else None,
        change_vs_baseline=float(rec.change_vs_baseline)
        if rec.change_vs_baseline is not None
        else None,
        cloud_cover_pct=float(rec.cloud_cover_pct) if rec.cloud_cover_pct is not None else None,
        provider=rec.provider,
    )


def _record_to_obs_fence(rec: PlantationSatelliteRecord) -> NdviObservation:
    return NdviObservation(
        scene_acquired_at=rec.scene_acquired_at,
        ndvi_mean=float(rec.ndvi_mean or 0),
        ndvi_min=float(rec.ndvi_min) if rec.ndvi_min is not None else None,
        ndvi_max=float(rec.ndvi_max) if rec.ndvi_max is not None else None,
        evi_mean=float(rec.evi_mean) if rec.evi_mean is not None else None,
        change_vs_baseline=float(rec.change_vs_baseline)
        if rec.change_vs_baseline is not None
        else None,
        cloud_cover_pct=float(rec.cloud_cover_pct) if rec.cloud_cover_pct is not None else None,
        provider=rec.provider,
    )


def _result_to_row(
    result,
    *,
    tree_id: uuid.UUID | None,
    fence_id: uuid.UUID | None,
    user_id: uuid.UUID | None,
) -> SatelliteHealthAnalysis:
    return SatelliteHealthAnalysis(
        tree_id=tree_id,
        fence_id=fence_id,
        triggered_by=user_id,
        model_pipeline=result.pipeline,
        risk_level=result.risk_level,
        health_status=result.health_status,
        summary=result.summary,
        ndvi_current=result.ndvi_current,
        ndvi_trend=result.ndvi_trend,
        trend_slope=result.trend_slope,
        pest_control_needed=result.pest_control_needed,
        disease_control_needed=result.disease_control_needed,
        findings=[
            {
                "category": f.category,
                "name": f.name,
                "confidence": f.confidence,
                "severity": f.severity,
                "evidence": f.evidence,
            }
            for f in result.findings
        ],
        treatments=[
            {
                "category": t.category,
                "action": t.action,
                "product_or_method": t.product_or_method,
                "priority": t.priority,
                "timing": t.timing,
                "notes": t.notes,
            }
            for t in result.treatments
        ],
        monitoring_plan=result.monitoring_plan,
        overall_confidence=result.confidence,
        raw_output=result.raw_signals,
    )


async def analyze_tree_satellite_health(
    db: AsyncSession,
    tree_id: uuid.UUID,
    user_id: uuid.UUID | None,
    *,
    species_hint: str | None = None,
) -> SatelliteHealthAnalysisOut:
    res = await db.execute(
        select(SatelliteRecord)
        .where(SatelliteRecord.tree_id == tree_id)
        .order_by(SatelliteRecord.scene_acquired_at.asc())
        .limit(24)
    )
    records = list(res.scalars().all())
    if not records:
        raise ValueError("no_satellite_records")

    obs = [_record_to_obs_tree(r) for r in records]
    result = analyze_satellite_ndvi_health(obs, species_hint=species_hint)
    row = _result_to_row(result, tree_id=tree_id, fence_id=None, user_id=user_id)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return SatelliteHealthAnalysisOut.model_validate(row)


async def analyze_fence_satellite_health(
    db: AsyncSession,
    fence_id: uuid.UUID,
    user_id: uuid.UUID | None,
    *,
    area_ha: float | None = None,
) -> SatelliteHealthAnalysisOut:
    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id == fence_id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.asc())
        .limit(24)
    )
    records = list(res.scalars().all())
    if not records:
        raise ValueError("no_satellite_records")

    obs = [_record_to_obs_fence(r) for r in records]
    result = analyze_satellite_ndvi_health(obs, area_ha=area_ha)
    row = _result_to_row(result, tree_id=None, fence_id=fence_id, user_id=user_id)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return SatelliteHealthAnalysisOut.model_validate(row)


async def latest_tree_analysis(
    db: AsyncSession, tree_id: uuid.UUID
) -> SatelliteHealthAnalysisOut | None:
    res = await db.execute(
        select(SatelliteHealthAnalysis)
        .where(SatelliteHealthAnalysis.tree_id == tree_id)
        .order_by(SatelliteHealthAnalysis.created_at.desc())
        .limit(1)
    )
    row = res.scalar_one_or_none()
    return SatelliteHealthAnalysisOut.model_validate(row) if row else None


async def latest_fence_analysis(
    db: AsyncSession, fence_id: uuid.UUID
) -> SatelliteHealthAnalysisOut | None:
    res = await db.execute(
        select(SatelliteHealthAnalysis)
        .where(SatelliteHealthAnalysis.fence_id == fence_id)
        .order_by(SatelliteHealthAnalysis.created_at.desc())
        .limit(1)
    )
    row = res.scalar_one_or_none()
    return SatelliteHealthAnalysisOut.model_validate(row) if row else None
