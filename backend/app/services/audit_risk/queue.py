"""Auditor priority queue summary."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import BoundaryVersion
from app.models.audit_risk import AuditAnomalyEvent, AuditRiskAssessment


async def auditor_queue_summary(
    db: AsyncSession, engagement_id: uuid.UUID
) -> dict[str, Any]:
    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement_id)
        )
    ).scalars().all()
    name_map = {b.id: b.name for b in boundaries}

    risk_rows = (
        await db.execute(
            select(AuditRiskAssessment)
            .where(AuditRiskAssessment.engagement_id == engagement_id)
            .order_by(AuditRiskAssessment.priority_rank.asc())
        )
    ).scalars().all()

    anomalies = (
        await db.execute(
            select(AuditAnomalyEvent).where(AuditAnomalyEvent.engagement_id == engagement_id)
        )
    ).scalars().all()

    level_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for r in risk_rows:
        level_counts[r.risk_level] = level_counts.get(r.risk_level, 0) + 1

    anomaly_by_block: dict[uuid.UUID, list[dict[str, Any]]] = {}
    for a in anomalies:
        anomaly_by_block.setdefault(a.boundary_version_id, []).append(
            {
                "id": str(a.id),
                "anomaly_type": a.anomaly_type,
                "severity": a.severity,
                "title": a.title,
                "summary": a.summary,
                "status": a.status,
                "epistemic_label": a.epistemic_label,
                "detected_at": a.detected_at.isoformat() if a.detected_at else None,
            }
        )

    queue: list[dict[str, Any]] = []
    for r in risk_rows:
        queue.append(
            {
                "id": str(r.id),
                "boundary_version_id": str(r.boundary_version_id),
                "boundary_name": name_map.get(r.boundary_version_id),
                "fence_id": str(r.fence_id) if r.fence_id else None,
                "risk_score": r.risk_score,
                "risk_level": r.risk_level,
                "priority_rank": r.priority_rank,
                "anomaly_count": r.anomaly_count,
                "recommended_action": r.recommended_action,
                "epistemic_label": r.epistemic_label,
                "assessed_at": r.assessed_at.isoformat() if r.assessed_at else None,
                "anomalies": anomaly_by_block.get(r.boundary_version_id, []),
            }
        )

    open_anomalies = [a for a in anomalies if a.status == "open"]

    return {
        "engagement_id": str(engagement_id),
        "block_count": len(boundaries),
        "assessed_count": len(risk_rows),
        "anomaly_count": len(anomalies),
        "open_anomaly_count": len(open_anomalies),
        "level_counts": level_counts,
        "queue": queue,
    }


async def anomalies_summary(
    db: AsyncSession, engagement_id: uuid.UUID
) -> dict[str, Any]:
    boundaries = (
        await db.execute(
            select(BoundaryVersion).where(BoundaryVersion.engagement_id == engagement_id)
        )
    ).scalars().all()
    name_map = {b.id: b.name for b in boundaries}

    anomalies = (
        await db.execute(
            select(AuditAnomalyEvent)
            .where(AuditAnomalyEvent.engagement_id == engagement_id)
            .order_by(AuditAnomalyEvent.detected_at.desc())
        )
    ).scalars().all()

    severity_counts: dict[str, int] = {}
    type_counts: dict[str, int] = {}
    items: list[dict[str, Any]] = []

    for a in anomalies:
        severity_counts[a.severity] = severity_counts.get(a.severity, 0) + 1
        type_counts[a.anomaly_type] = type_counts.get(a.anomaly_type, 0) + 1
        items.append(
            {
                "id": str(a.id),
                "boundary_version_id": str(a.boundary_version_id),
                "boundary_name": name_map.get(a.boundary_version_id),
                "anomaly_type": a.anomaly_type,
                "severity": a.severity,
                "title": a.title,
                "summary": a.summary,
                "status": a.status,
                "epistemic_label": a.epistemic_label,
                "signals": a.signals or {},
                "detected_at": a.detected_at.isoformat() if a.detected_at else None,
            }
        )

    return {
        "engagement_id": str(engagement_id),
        "anomaly_count": len(anomalies),
        "severity_counts": severity_counts,
        "type_counts": type_counts,
        "anomalies": items,
    }
