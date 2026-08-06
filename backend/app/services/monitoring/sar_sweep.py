"""Persist SAR scans and raise NISAR-inspired monitoring alerts."""

from __future__ import annotations

import uuid
from typing import Any

from geoalchemy2.shape import to_shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.plantation_fence import PlantationFence
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.models.satellite import SatelliteRecord
from app.models.tree import Tree
from app.models.user import User
from app.services.geo import geography_to_geojson_polygon
from app.services.monitoring.alert_engine import create_monitoring_alert
from app.services.satellite.sar_analytics import analyze_sar_sample
from app.services.satellite.sar_service import get_sar_service, is_sar_provider_record
from app.services.satellite.sar_types import SarAnalysisResult

log = get_logger("monitoring.sar")


async def _latest_ndvi_for_tree(db: AsyncSession, tree_id: uuid.UUID) -> float | None:
    res = await db.execute(
        select(SatelliteRecord)
        .where(SatelliteRecord.tree_id == tree_id)
        .order_by(SatelliteRecord.scene_acquired_at.desc())
        .limit(5)
    )
    for row in res.scalars().all():
        if not is_sar_provider_record(row.provider) and row.ndvi_mean is not None:
            return float(row.ndvi_mean)
    return None


async def _latest_ndvi_for_fence(db: AsyncSession, fence_id: uuid.UUID) -> float | None:
    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id == fence_id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
        .limit(5)
    )
    for row in res.scalars().all():
        if not is_sar_provider_record(row.provider) and row.ndvi_mean is not None:
            return float(row.ndvi_mean)
    return None


def _analysis_to_metadata(analysis: SarAnalysisResult) -> dict[str, Any]:
    return {
        "sar_analysis": {
            "risk_level": analysis.risk_level,
            "ground_status": analysis.ground_status,
            "summary": analysis.summary,
            "findings": [
                {
                    "category": f.category,
                    "name": f.name,
                    "confidence": f.confidence,
                    "severity": f.severity,
                    "evidence": f.evidence,
                }
                for f in analysis.findings
            ],
            "pipeline": analysis.pipeline,
            "raw_signals": analysis.raw_signals,
        }
    }


async def maybe_alert_sar_risks(
    db: AsyncSession,
    *,
    user: User | None,
    analysis: SarAnalysisResult,
    payload_base: dict[str, Any],
    title_prefix: str,
    dedupe_keys: tuple[str, ...],
) -> None:
    if user is None or analysis.risk_level == "low":
        return

    alert_map = {
        "sar_hidden_moisture": (
            "sar_hidden_moisture",
            "high",
            "Hidden ground moisture under canopy",
        ),
        "wetland_forest_detected": (
            "sar_wetland_detected",
            "high",
            "Wetland forest detected (L-band SAR)",
        ),
        "double_bounce_scattering": (
            "sar_flood_risk",
            "high",
            "Waterlogging / double-bounce signal",
        ),
        "elevated_ground_moisture": (
            "sar_ground_moisture",
            "moderate",
            "Elevated ground moisture",
        ),
        "low_coherence": (
            "sar_ground_instability",
            "moderate",
            "Ground instability signal",
        ),
    }

    for finding in analysis.findings:
        spec = alert_map.get(finding.name)
        if spec is None:
            continue
        kind, severity, label = spec
        await create_monitoring_alert(
            db,
            user=user,
            kind=kind,
            severity=severity,
            title=f"{label} — {title_prefix}",
            message=finding.evidence,
            payload={
                **payload_base,
                "finding": finding.name,
                "confidence": finding.confidence,
                "ground_status": analysis.ground_status,
                "wetland_probability": analysis.wetland_probability,
            },
            prefs_key="satellite_health",
            dedupe_hours=168,
            dedupe_keys=dedupe_keys,
        )


async def scan_and_persist_tree_sar(
    db: AsyncSession,
    tree: Tree,
    *,
    notify_user: User | None = None,
) -> tuple[SatelliteRecord, SarAnalysisResult] | None:
    try:
        pt = to_shape(tree.location)
        lat, lon = pt.y, pt.x
    except Exception:
        return None

    sample = await get_sar_service().sample_point(lat, lon)
    ndvi = await _latest_ndvi_for_tree(db, tree.id)
    analysis = analyze_sar_sample(sample, ndvi_mean=ndvi)
    meta = sample.to_raw_metadata()
    meta.update(_analysis_to_metadata(analysis))

    rec = SatelliteRecord(
        tree_id=tree.id,
        provider=sample.provider,
        scene_id=sample.scene_id,
        scene_acquired_at=sample.scene_acquired_at,
        cloud_cover_pct=0.0,
        raw_metadata=meta,
    )
    db.add(rec)
    await db.flush()

    notify = notify_user
    if notify is None and tree.owner_user_id:
        notify = await db.get(User, tree.owner_user_id)

    await maybe_alert_sar_risks(
        db,
        user=notify,
        analysis=analysis,
        payload_base={"tree_id": str(tree.id), "project_id": str(tree.project_id) if tree.project_id else None},
        title_prefix=tree.public_code,
        dedupe_keys=("tree_id", "finding"),
    )
    return rec, analysis


async def scan_and_persist_fence_sar(
    db: AsyncSession,
    fence: PlantationFence,
    *,
    notify_user_id: uuid.UUID | None = None,
) -> tuple[PlantationSatelliteRecord, SarAnalysisResult] | None:
    boundary = geography_to_geojson_polygon(fence.boundary)
    try:
        sample = await get_sar_service().sample_polygon(boundary)
    except Exception as exc:
        log.warning("fence_sar_scan_failed", fence_id=str(fence.id), error=str(exc))
        return None

    ndvi = await _latest_ndvi_for_fence(db, fence.id)
    analysis = analyze_sar_sample(sample, ndvi_mean=ndvi)
    meta = sample.to_raw_metadata()
    meta.update(_analysis_to_metadata(analysis))

    rec = PlantationSatelliteRecord(
        fence_id=fence.id,
        provider=sample.provider,
        scene_id=sample.scene_id,
        scene_acquired_at=sample.scene_acquired_at,
        cloud_cover_pct=0.0,
        raw_metadata=meta,
    )
    db.add(rec)
    await db.flush()

    owner_id = notify_user_id or fence.owner_user_id
    owner = await db.get(User, owner_id) if owner_id else None
    await maybe_alert_sar_risks(
        db,
        user=owner,
        analysis=analysis,
        payload_base={
            "fence_id": str(fence.id),
            "project_id": str(fence.project_id) if fence.project_id else None,
        },
        title_prefix=fence.name,
        dedupe_keys=("fence_id", "finding"),
    )
    return rec, analysis


async def latest_sar_record_for_tree(db: AsyncSession, tree_id: uuid.UUID) -> SatelliteRecord | None:
    res = await db.execute(
        select(SatelliteRecord)
        .where(SatelliteRecord.tree_id == tree_id)
        .order_by(SatelliteRecord.scene_acquired_at.desc())
        .limit(20)
    )
    for row in res.scalars().all():
        if is_sar_provider_record(row.provider):
            return row
    return None


async def latest_sar_record_for_fence(db: AsyncSession, fence_id: uuid.UUID) -> PlantationSatelliteRecord | None:
    res = await db.execute(
        select(PlantationSatelliteRecord)
        .where(PlantationSatelliteRecord.fence_id == fence_id)
        .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
        .limit(20)
    )
    for row in res.scalars().all():
        if is_sar_provider_record(row.provider):
            return row
    return None


def serialize_sar_record(rec: SatelliteRecord | PlantationSatelliteRecord) -> dict[str, Any]:
    meta = rec.raw_metadata or {}
    analysis = meta.get("sar_analysis") or {}
    return {
        "id": str(rec.id),
        "provider": rec.provider,
        "scene_id": rec.scene_id,
        "scene_acquired_at": rec.scene_acquired_at,
        "l_band_hh_db": meta.get("l_band_hh_db"),
        "s_band_hh_db": meta.get("s_band_hh_db"),
        "double_bounce_index": meta.get("double_bounce_index"),
        "wetland_probability": meta.get("wetland_probability"),
        "ground_moisture_index": meta.get("ground_moisture_index"),
        "canopy_ground_mismatch": meta.get("canopy_ground_mismatch"),
        "frequency_bands": meta.get("frequency_bands"),
        "polarimetric_composite": meta.get("polarimetric_composite"),
        "coherence": meta.get("coherence"),
        "analysis": analysis,
    }
