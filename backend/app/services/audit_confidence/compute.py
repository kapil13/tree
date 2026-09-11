"""Compute and persist plantation confidence assessments."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_confidence import AuditConfidenceAssessment
from app.models.audit_engagement import (
    AuditEngagement,
    BoundaryVersion,
    GisValidationRun,
    PlausibilityAssessment,
)
from app.models.audit_satellite import AuditSatelliteBaseline, AuditTemporalObservation
from app.models.plantation_satellite_record import PlantationSatelliteRecord
from app.services.audit_confidence.fusion import fuse_block_confidence
from app.services.satellite.sar_service import is_sar_provider_record


async def _latest_gis_run(db: AsyncSession, engagement_id: uuid.UUID) -> GisValidationRun | None:
    row = await db.execute(
        select(GisValidationRun)
        .where(GisValidationRun.engagement_id == engagement_id)
        .order_by(GisValidationRun.run_at.desc())
        .limit(1)
    )
    return row.scalar_one_or_none()


def _gis_issues_for_block(
    gis_run: GisValidationRun | None, boundary_id: uuid.UUID
) -> list[dict[str, Any]]:
    if gis_run is None:
        return []
    issues = gis_run.issues or []
    bid = str(boundary_id)
    return [
        i
        for i in issues
        if bid in str(i.get("boundary_id", ""))
        or bid in [str(x) for x in i.get("boundary_ids", [])]
    ]


async def _sar_integrity_score(
    db: AsyncSession, fence_id: uuid.UUID | None
) -> float | None:
    if fence_id is None:
        return None
    rows = (
        await db.execute(
            select(PlantationSatelliteRecord)
            .where(PlantationSatelliteRecord.fence_id == fence_id)
            .order_by(PlantationSatelliteRecord.scene_acquired_at.desc())
            .limit(5)
        )
    ).scalars().all()
    for rec in rows:
        if not is_sar_provider_record(rec.provider):
            continue
        meta = rec.raw_metadata or {}
        fusion = meta.get("fusion") or {}
        score = fusion.get("forest_integrity_score")
        if score is not None:
            return float(score)
    return None


async def compute_confidence_map(
    db: AsyncSession,
    engagement: AuditEngagement,
) -> list[AuditConfidenceAssessment]:
    if engagement.status not in {"analysis_ready", "confidence_mapped"}:
        raise ValueError("analysis_not_ready")

    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement.id)
        )
    ).scalars().all()
    if not boundaries:
        raise ValueError("no_boundaries")

    plausibility_rows = (
        await db.execute(
            select(PlausibilityAssessment).where(
                PlausibilityAssessment.engagement_id == engagement.id
            )
        )
    ).scalars().all()
    plausibility_map = {p.boundary_version_id: p for p in plausibility_rows}

    baselines = (
        await db.execute(
            select(AuditSatelliteBaseline).where(
                AuditSatelliteBaseline.engagement_id == engagement.id
            )
        )
    ).scalars().all()
    baseline_map = {b.boundary_version_id: b for b in baselines}

    temporal_rows = (
        await db.execute(
            select(AuditTemporalObservation).where(
                AuditTemporalObservation.engagement_id == engagement.id
            )
        )
    ).scalars().all()
    current_map: dict[uuid.UUID, AuditTemporalObservation] = {}
    for obs in temporal_rows:
        if obs.phase == "current":
            current_map[obs.boundary_version_id] = obs

    gis_run = await _latest_gis_run(db, engagement.id)
    gis_status = gis_run.status if gis_run else None

    results: list[AuditConfidenceAssessment] = []
    for bv in boundaries:
        plaus = plausibility_map.get(bv.id)
        baseline = baseline_map.get(bv.id)
        current = current_map.get(bv.id)
        sar_score = await _sar_integrity_score(db, bv.fence_id)

        fused = fuse_block_confidence(
            block_name=bv.name,
            plausibility_verdict=plaus.verdict if plaus else None,
            plausibility_signals=plaus.signals if plaus else None,
            gis_status=gis_status,
            gis_block_issues=_gis_issues_for_block(gis_run, bv.id),
            t0_backfill_status=baseline.backfill_status if baseline else None,
            t0_ndvi=float(baseline.t0_ndvi_mean) if baseline and baseline.t0_ndvi_mean else None,
            current_ndvi=float(current.ndvi_mean) if current and current.ndvi_mean else None,
            change_vs_t0=float(current.change_vs_t0) if current and current.change_vs_t0 else None,
            sar_integrity_score=sar_score,
        )

        existing = (
            await db.execute(
                select(AuditConfidenceAssessment).where(
                    AuditConfidenceAssessment.engagement_id == engagement.id,
                    AuditConfidenceAssessment.boundary_version_id == bv.id,
                )
            )
        ).scalar_one_or_none()

        if existing:
            row = existing
        else:
            row = AuditConfidenceAssessment(
                engagement_id=engagement.id,
                boundary_version_id=bv.id,
                fence_id=bv.fence_id,
            )
            db.add(row)

        row.fence_id = bv.fence_id
        row.confidence_grade = fused["confidence_grade"]
        row.confidence_score = fused["confidence_score"]
        row.epistemic_label = fused["epistemic_label"]
        row.summary = fused["summary"]
        row.signals = fused["signals"]
        row.grid_cells = fused["grid_cells"]
        row.computed_at = datetime.now(UTC)
        results.append(row)

    engagement.status = "confidence_mapped"
    meta = dict(engagement.metadata_ or {})
    meta["confidence_mapped_at"] = datetime.now(UTC).isoformat()
    engagement.metadata_ = meta
    await db.flush()
    return results


async def confidence_map_summary(
    db: AsyncSession, engagement_id: uuid.UUID
) -> dict[str, Any]:
    assessments = (
        await db.execute(
            select(AuditConfidenceAssessment).where(
                AuditConfidenceAssessment.engagement_id == engagement_id
            )
        )
    ).scalars().all()
    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement_id)
        )
    ).scalars().all()
    name_map = {b.id: b.name for b in boundaries}

    grade_counts = {"green": 0, "amber": 0, "red": 0, "grey": 0}
    blocks: list[dict[str, Any]] = []
    for a in assessments:
        grade_counts[a.confidence_grade] = grade_counts.get(a.confidence_grade, 0) + 1
        blocks.append(
            {
                "id": str(a.id),
                "boundary_version_id": str(a.boundary_version_id),
                "boundary_name": name_map.get(a.boundary_version_id),
                "fence_id": str(a.fence_id) if a.fence_id else None,
                "confidence_grade": a.confidence_grade,
                "confidence_score": a.confidence_score,
                "epistemic_label": a.epistemic_label,
                "summary": a.summary,
                "signals": a.signals or {},
                "grid_cells": a.grid_cells or [],
                "computed_at": a.computed_at.isoformat() if a.computed_at else None,
            }
        )

    return {
        "engagement_id": str(engagement_id),
        "block_count": len(boundaries),
        "assessed_count": len(assessments),
        "grade_counts": grade_counts,
        "blocks": blocks,
    }
