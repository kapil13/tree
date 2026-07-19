"""Persist and load satellite NDVI health analyses."""

from __future__ import annotations

import contextlib
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.satellite import SatelliteRecord
from app.models.satellite_health_analysis import SatelliteHealthAnalysis
from app.models.tree import Tree
from app.models.user import User
from app.schemas.satellite_health import SatelliteHealthAnalysisOut
from app.services.ai.satellite_health import analyze_satellite_ndvi_health
from app.services.ai.satellite_health_llm import enrich_satellite_health_narrative
from app.services.ai.satellite_health_types import NdviObservation, SatelliteHealthResult
from app.services.alerts.service import create_satellite_health_alert


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


async def _prior_risk(
    db: AsyncSession,
    *,
    tree_id: uuid.UUID | None,
    fence_id: uuid.UUID | None,
) -> str | None:
    stmt = select(SatelliteHealthAnalysis).order_by(SatelliteHealthAnalysis.created_at.desc()).limit(1)
    if tree_id:
        stmt = stmt.where(SatelliteHealthAnalysis.tree_id == tree_id)
    else:
        stmt = stmt.where(SatelliteHealthAnalysis.fence_id == fence_id)
    row = (await db.execute(stmt)).scalar_one_or_none()
    return row.risk_level if row else None


async def _apply_llm_enrichment(
    result: SatelliteHealthResult,
    obs: list[NdviObservation],
    *,
    species_hint: str | None,
    target_label: str,
) -> SatelliteHealthResult:
    narrative = await enrich_satellite_health_narrative(
        result, obs, species_hint=species_hint, target_label=target_label
    )
    if not narrative:
        return result

    result.llm_narrative = narrative
    result.raw_signals = {**result.raw_signals, "rule_summary": result.summary}
    result.summary = narrative
    result.pipeline = f"{result.pipeline}+gpt-4o-mini-narrative"
    return result


def _result_to_row(
    result: SatelliteHealthResult,
    *,
    tree_id: uuid.UUID | None,
    fence_id: uuid.UUID | None,
    user_id: uuid.UUID | None,
) -> SatelliteHealthAnalysis:
    raw = dict(result.raw_signals)
    if result.llm_narrative:
        raw["llm_narrative"] = result.llm_narrative

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
        raw_output=raw,
    )


def _out_from_row(row: SatelliteHealthAnalysis) -> SatelliteHealthAnalysisOut:
    out = SatelliteHealthAnalysisOut.model_validate(row)
    if row.raw_output and row.raw_output.get("llm_narrative"):
        out.llm_narrative = row.raw_output["llm_narrative"]
    return out


async def _notify_if_needed(
    db: AsyncSession,
    *,
    user_id: uuid.UUID | None,
    result: SatelliteHealthResult,
    analysis_id: uuid.UUID,
    tree_id: uuid.UUID | None,
    fence_id: uuid.UUID | None,
    target_label: str,
    prior_risk: str | None,
) -> None:
    if user_id is None:
        return
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        return
    with contextlib.suppress(Exception):
        await create_satellite_health_alert(
            db,
            user=user,
            result=result,
            analysis_id=analysis_id,
            tree_id=tree_id,
            fence_id=fence_id,
            target_label=target_label,
            prior_risk=prior_risk,
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

    tree = (await db.execute(select(Tree).where(Tree.id == tree_id))).scalar_one_or_none()
    hint = species_hint or (tree.species_text if tree else None)
    target_label = hint or f"tree {str(tree_id)[:8]}"

    prior = await _prior_risk(db, tree_id=tree_id, fence_id=None)
    obs = [_record_to_obs_tree(r) for r in records]
    result = analyze_satellite_ndvi_health(obs, species_hint=hint)
    result = await _apply_llm_enrichment(result, obs, species_hint=hint, target_label=target_label)

    row = _result_to_row(result, tree_id=tree_id, fence_id=None, user_id=user_id)
    db.add(row)
    await db.commit()
    await db.refresh(row)

    notify_user = user_id or (tree.owner_user_id if tree else None)
    await _notify_if_needed(
        db,
        user_id=notify_user,
        result=result,
        analysis_id=row.id,
        tree_id=tree_id,
        fence_id=None,
        target_label=target_label,
        prior_risk=prior,
    )
    return _out_from_row(row)


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

    fence = (
        await db.execute(select(PlantationFence).where(PlantationFence.id == fence_id))
    ).scalar_one_or_none()
    target_label = fence.name if fence else f"fence {str(fence_id)[:8]}"

    prior = await _prior_risk(db, tree_id=None, fence_id=fence_id)
    obs = [_record_to_obs_fence(r) for r in records]
    result = analyze_satellite_ndvi_health(obs, area_ha=area_ha)
    result = await _apply_llm_enrichment(
        result, obs, species_hint=None, target_label=target_label
    )

    row = _result_to_row(result, tree_id=None, fence_id=fence_id, user_id=user_id)
    db.add(row)
    await db.commit()
    await db.refresh(row)

    notify_user = user_id or (fence.owner_user_id if fence else None)
    await _notify_if_needed(
        db,
        user_id=notify_user,
        result=result,
        analysis_id=row.id,
        tree_id=None,
        fence_id=fence_id,
        target_label=target_label,
        prior_risk=prior,
    )
    return _out_from_row(row)


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
    return _out_from_row(row) if row else None


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
    return _out_from_row(row) if row else None
