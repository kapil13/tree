"""P7–P9 — cross-estate anomaly pattern detection."""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_engagement import AuditEngagement
from app.models.audit_portfolio_ops import AuditBenchmarkBaseline, AuditCrossEstatePattern
from app.models.audit_risk import AuditAnomalyEvent
from app.models.audit_sampling import AuditFieldVisit
from app.services.audit_portfolio.benchmarks import compute_benchmark_baselines
from app.services.audit_portfolio.rollups import compute_org_portfolio_rollups


async def detect_cross_estate_patterns(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
) -> list[AuditCrossEstatePattern]:
    await compute_org_portfolio_rollups(db, organization_id=organization_id)
    await compute_benchmark_baselines(db, organization_id=organization_id, scope="org")

    engagements = list(
        (
            await db.execute(
                select(AuditEngagement).where(AuditEngagement.organization_id == organization_id)
            )
        ).scalars().all()
    )
    engagement_ids = [e.id for e in engagements]
    if not engagement_ids:
        return []

    anomalies = list(
        (
            await db.execute(
                select(AuditAnomalyEvent).where(
                    AuditAnomalyEvent.engagement_id.in_(engagement_ids),
                    AuditAnomalyEvent.status == "open",
                )
            )
        ).scalars().all()
    )

    now = datetime.now(UTC)
    patterns: list[AuditCrossEstatePattern] = []

    by_type: dict[str, set[str]] = defaultdict(set)
    severity_peak: dict[str, str] = {}
    for anomaly in anomalies:
        by_type[anomaly.anomaly_type].add(str(anomaly.engagement_id))
        current = severity_peak.get(anomaly.anomaly_type, "low")
        rank = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        if rank.get(anomaly.severity, 0) > rank.get(current, 0):
            severity_peak[anomaly.anomaly_type] = anomaly.severity

    for anomaly_type, affected in by_type.items():
        if len(affected) < 2:
            continue
        patterns.append(
            await _upsert_pattern(
                db,
                organization_id=organization_id,
                pattern_type="recurring_anomaly",
                anomaly_type=anomaly_type,
                engagement_count=len(affected),
                affected_engagement_ids=sorted(affected),
                severity_peak=severity_peak.get(anomaly_type),
                summary=(
                    f"Open anomaly '{anomaly_type}' appears across {len(affected)} engagements."
                ),
                signals={"anomaly_type": anomaly_type},
                detected_at=now,
            )
        )

    from app.models.audit_cycle import AuditCycle

    gps_rows = (
        await db.execute(
            select(AuditEngagement.id)
            .join(AuditCycle, AuditCycle.engagement_id == AuditEngagement.id)
            .join(AuditFieldVisit, AuditFieldVisit.cycle_id == AuditCycle.id)
            .where(
                AuditEngagement.organization_id == organization_id,
                AuditFieldVisit.gps_integrity_passed.is_(False),
            )
            .distinct()
        )
    ).scalars().all()
    gps_fail_engagements = {str(eid) for eid in gps_rows}

    if len(gps_fail_engagements) >= 2:
        patterns.append(
            await _upsert_pattern(
                db,
                organization_id=organization_id,
                pattern_type="gps_integrity_cluster",
                anomaly_type=None,
                engagement_count=len(gps_fail_engagements),
                affected_engagement_ids=sorted(gps_fail_engagements),
                severity_peak="high" if len(gps_fail_engagements) >= 3 else "medium",
                summary=(
                    f"GPS integrity failures detected across {len(gps_fail_engagements)} engagements."
                ),
                signals={"engagement_ids": sorted(gps_fail_engagements)},
                detected_at=now,
            )
        )

    mismatch_baseline = (
        await db.execute(
            select(AuditBenchmarkBaseline).where(
                AuditBenchmarkBaseline.organization_id == organization_id,
                AuditBenchmarkBaseline.metric_code == "mismatch_rate",
            )
        )
    ).scalar_one_or_none()

    if mismatch_baseline and float(mismatch_baseline.metric_value) > 0.25:
        patterns.append(
            await _upsert_pattern(
                db,
                organization_id=organization_id,
                pattern_type="elevated_mismatch_rate",
                anomaly_type=None,
                engagement_count=len(engagements),
                affected_engagement_ids=[str(e.id) for e in engagements],
                severity_peak="high",
                summary=(
                    f"Portfolio mismatch rate {float(mismatch_baseline.metric_value):.0%} "
                    "exceeds 25% benchmark threshold."
                ),
                signals={"mismatch_rate": float(mismatch_baseline.metric_value)},
                detected_at=now,
            )
        )

    await db.flush()
    return patterns


async def _upsert_pattern(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    pattern_type: str,
    anomaly_type: str | None,
    engagement_count: int,
    affected_engagement_ids: list[str],
    severity_peak: str | None,
    summary: str,
    signals: dict[str, Any],
    detected_at: datetime,
) -> AuditCrossEstatePattern:
    existing = (
        await db.execute(
            select(AuditCrossEstatePattern).where(
                AuditCrossEstatePattern.organization_id == organization_id,
                AuditCrossEstatePattern.pattern_type == pattern_type,
                AuditCrossEstatePattern.anomaly_type == anomaly_type,
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.engagement_count = engagement_count
        existing.affected_engagement_ids = affected_engagement_ids
        existing.severity_peak = severity_peak
        existing.summary = summary
        existing.signals = signals
        existing.detected_at = detected_at
        return existing

    row = AuditCrossEstatePattern(
        organization_id=organization_id,
        pattern_type=pattern_type,
        anomaly_type=anomaly_type,
        engagement_count=engagement_count,
        affected_engagement_ids=affected_engagement_ids,
        severity_peak=severity_peak,
        summary=summary,
        signals=signals,
        detected_at=detected_at,
    )
    db.add(row)
    return row


async def list_cross_estate_patterns(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
) -> list[AuditCrossEstatePattern]:
    return list(
        (
            await db.execute(
                select(AuditCrossEstatePattern)
                .where(AuditCrossEstatePattern.organization_id == organization_id)
                .order_by(AuditCrossEstatePattern.detected_at.desc())
            )
        ).scalars().all()
    )


def pattern_to_dict(row: AuditCrossEstatePattern) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "organization_id": str(row.organization_id) if row.organization_id else None,
        "pattern_type": row.pattern_type,
        "anomaly_type": row.anomaly_type,
        "engagement_count": row.engagement_count,
        "affected_engagement_ids": row.affected_engagement_ids,
        "severity_peak": row.severity_peak,
        "summary": row.summary,
        "signals": row.signals,
        "detected_at": row.detected_at.isoformat() if row.detected_at else None,
    }
