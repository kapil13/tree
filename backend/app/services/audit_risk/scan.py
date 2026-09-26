"""Run risk scan across all blocks and persist anomalies + assessments."""

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
    PlausibilityAssessment,
)
from app.models.audit_risk import AuditAnomalyEvent, AuditRiskAssessment
from app.models.audit_satellite import AuditTemporalObservation
from app.models.planting_project import PlantingProject
from app.models.user import User
from app.services.audit_confidence.compute import _gis_issues_for_block, _latest_gis_run
from app.services.audit_intake.claim_snapshot import get_working_claim
from app.services.audit_risk.detect import compute_block_risk, detect_block_anomalies
from app.services.monitoring.alert_engine import create_monitoring_alert

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


async def _upsert_anomaly(
    db: AsyncSession,
    *,
    engagement_id: uuid.UUID,
    cycle_id: uuid.UUID,
    boundary_version_id: uuid.UUID,
    detected_at: datetime,
    anomaly: dict[str, Any],
) -> AuditAnomalyEvent:
    existing = (
        await db.execute(
            select(AuditAnomalyEvent).where(
                AuditAnomalyEvent.cycle_id == cycle_id,
                AuditAnomalyEvent.boundary_version_id == boundary_version_id,
                AuditAnomalyEvent.anomaly_type == anomaly["anomaly_type"],
            )
        )
    ).scalar_one_or_none()

    if existing:
        row = existing
    else:
        row = AuditAnomalyEvent(
            engagement_id=engagement_id,
            cycle_id=cycle_id,
            boundary_version_id=boundary_version_id,
            anomaly_type=anomaly["anomaly_type"],
        )
        db.add(row)

    row.severity = anomaly["severity"]
    row.epistemic_label = anomaly["epistemic_label"]
    row.title = anomaly["title"]
    row.summary = anomaly["summary"]
    row.signals = anomaly.get("signals") or {}
    row.status = "open"
    row.detected_at = detected_at
    return row


async def _emit_critical_alerts(
    db: AsyncSession,
    *,
    project: PlantingProject,
    engagement: AuditEngagement,
    anomalies: list[AuditAnomalyEvent],
) -> int:
    if not project.owner_user_id:
        return 0
    owner = await db.get(User, project.owner_user_id)
    if owner is None:
        return 0

    created = 0
    for anomaly in anomalies:
        if anomaly.severity not in {"critical", "high"}:
            continue
        if anomaly.anomaly_type not in {
            "ndvi_acute_drop",
            "growth_deviation",
            "confidence_low",
            "plausibility_concern",
        }:
            continue

        alert = await create_monitoring_alert(
            db,
            user=owner,
            kind="audit_anomaly",
            severity="critical" if anomaly.severity == "critical" else "high",
            title=anomaly.title,
            message=anomaly.summary,
            payload={
                "engagement_id": str(engagement.id),
                "project_id": str(project.id),
                "boundary_version_id": str(anomaly.boundary_version_id),
                "anomaly_type": anomaly.anomaly_type,
                "anomaly_id": str(anomaly.id),
                "fence_id": None,
            },
            prefs_key="satellite_health",
            dedupe_hours=168,
            dedupe_keys=("engagement_id", "boundary_version_id", "anomaly_type"),
        )
        if alert:
            created += 1
    return created


async def run_risk_scan(
    db: AsyncSession,
    engagement: AuditEngagement,
    project: PlantingProject,
    *,
    created_by: uuid.UUID | None = None,
) -> dict[str, Any]:
    from app.services.audit_cycles.run_wrapper import execute_audit_run
    from app.services.audit_governance.engagement import (
        require_mutable_cycle,
        set_engagement_status,
    )

    cycle = await require_mutable_cycle(db, engagement)
    if engagement.status not in {"confidence_mapped", "risk_assessed"}:
        raise ValueError("confidence_not_mapped")

    async def _scan() -> dict[str, Any]:
        return await _run_risk_scan_for_cycle(db, engagement, project, cycle)

    summary, _run = await execute_audit_run(
        db,
        cycle,
        run_type="risk_scan",
        created_by=created_by,
        work=_scan,
    )
    await set_engagement_status(db, engagement, "risk_assessed")
    return summary


async def _run_risk_scan_for_cycle(
    db: AsyncSession,
    engagement: AuditEngagement,
    project: PlantingProject,
    cycle,
) -> dict[str, Any]:
    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement.id)
        )
    ).scalars().all()
    if not boundaries:
        raise ValueError("no_boundaries")

    confidence_rows = (
        await db.execute(
            select(AuditConfidenceAssessment).where(
                AuditConfidenceAssessment.cycle_id == cycle.id
            )
        )
    ).scalars().all()
    if not confidence_rows:
        raise ValueError("no_confidence_map")

    confidence_map = {c.boundary_version_id: c for c in confidence_rows}

    plausibility_rows = (
        await db.execute(
            select(PlausibilityAssessment).where(
                PlausibilityAssessment.engagement_id == engagement.id
            )
        )
    ).scalars().all()
    plausibility_map = {p.boundary_version_id: p for p in plausibility_rows}

    temporal_rows = (
        await db.execute(
            select(AuditTemporalObservation).where(
                AuditTemporalObservation.cycle_id == cycle.id
            )
        )
    ).scalars().all()
    temporal_by_block: dict[uuid.UUID, list[dict[str, Any]]] = {}
    for obs in temporal_rows:
        temporal_by_block.setdefault(obs.boundary_version_id, []).append(
            {
                "phase": obs.phase,
                "ndvi_mean": float(obs.ndvi_mean) if obs.ndvi_mean is not None else None,
            }
        )

    gis_run = await _latest_gis_run(db, engagement.id)
    working_claim = await get_working_claim(engagement)
    trees_claimed = working_claim.get("trees_claimed")
    trees_int = int(trees_claimed) if trees_claimed is not None else None

    from app.services.audit_governance.methodology_resolver import resolve_thresholds

    thresholds = await resolve_thresholds(db, engagement=engagement)
    ndvi_drop = float(thresholds.get("ndvi_acute_drop", -0.12))

    detected_at = datetime.now(UTC)
    all_anomalies: list[AuditAnomalyEvent] = []
    risk_rows: list[AuditRiskAssessment] = []

    for bv in boundaries:
        conf = confidence_map.get(bv.id)
        plaus = plausibility_map.get(bv.id)
        anomaly_dicts = detect_block_anomalies(
            block_name=bv.name,
            temporal_observations=temporal_by_block.get(bv.id, []),
            confidence_grade=conf.confidence_grade if conf else None,
            confidence_score=conf.confidence_score if conf else None,
            plausibility_verdict=plaus.verdict if plaus else None,
            gis_block_issues=_gis_issues_for_block(gis_run, bv.id),
            ndvi_acute_drop_threshold=ndvi_drop,
            trees_claimed=trees_int,
        )

        block_anomalies: list[AuditAnomalyEvent] = []
        for ad in anomaly_dicts:
            row = await _upsert_anomaly(
                db,
                engagement_id=engagement.id,
                cycle_id=cycle.id,
                boundary_version_id=bv.id,
                detected_at=detected_at,
                anomaly=ad,
            )
            block_anomalies.append(row)
            all_anomalies.append(row)

        risk = compute_block_risk(
            anomalies=anomaly_dicts,
            confidence_score=conf.confidence_score if conf else None,
        )

        existing_risk = (
            await db.execute(
                select(AuditRiskAssessment).where(
                    AuditRiskAssessment.cycle_id == cycle.id,
                    AuditRiskAssessment.boundary_version_id == bv.id,
                )
            )
        ).scalar_one_or_none()

        if existing_risk:
            risk_row = existing_risk
        else:
            risk_row = AuditRiskAssessment(
                engagement_id=engagement.id,
                cycle_id=cycle.id,
                boundary_version_id=bv.id,
            )
            db.add(risk_row)

        risk_row.fence_id = bv.fence_id
        risk_row.risk_score = risk["risk_score"]
        risk_row.risk_level = risk["risk_level"]
        risk_row.anomaly_count = risk["anomaly_count"]
        risk_row.recommended_action = risk["recommended_action"]
        risk_row.epistemic_label = risk["epistemic_label"]
        risk_row.signals = risk["signals"]
        risk_row.assessed_at = detected_at
        risk_rows.append(risk_row)

    risk_rows.sort(key=lambda r: (-r.risk_score, r.boundary_version_id))
    for rank, row in enumerate(risk_rows, start=1):
        row.priority_rank = rank

    alerts_created = await _emit_critical_alerts(
        db, project=project, engagement=engagement, anomalies=all_anomalies
    )

    meta = dict(engagement.metadata_ or {})
    meta["risk_assessed_at"] = detected_at.isoformat()
    engagement.metadata_ = meta

    severity_counts: dict[str, int] = {}
    for a in all_anomalies:
        severity_counts[a.severity] = severity_counts.get(a.severity, 0) + 1

    return {
        "anomalies_detected": len(all_anomalies),
        "blocks_assessed": len(risk_rows),
        "alerts_created": alerts_created,
        "severity_counts": severity_counts,
    }
