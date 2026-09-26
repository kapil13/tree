"""P5 — persisted portfolio cycle rollups."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_confidence import AuditConfidenceAssessment
from app.models.audit_cycle import AuditCycle
from app.models.audit_engagement import AuditEngagement
from app.models.audit_portfolio_ops import AuditPortfolioCycleRollup
from app.models.audit_risk import AuditAnomalyEvent, AuditRiskAssessment
from app.models.audit_sampling import AuditFieldPlot
from app.models.planting_project import PlantingProject
from app.services.audit_cycles.scope import resolve_read_cycle_id
from app.services.audit_portfolio.queries import active_plan_plot_ids
from app.services.audit_reconciliation.persist import latest_reconciliation_run


def _count_grades(assessments: list[AuditConfidenceAssessment]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in assessments:
        counts[row.confidence_grade] = counts.get(row.confidence_grade, 0) + 1
    return counts


def _count_risk_levels(rows: list[AuditRiskAssessment]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        counts[row.risk_level] = counts.get(row.risk_level, 0) + 1
    return counts


async def compute_cycle_rollup(
    db: AsyncSession,
    *,
    cycle_id: uuid.UUID,
) -> AuditPortfolioCycleRollup:
    cycle = await db.get(AuditCycle, cycle_id)
    if cycle is None:
        raise ValueError("cycle_not_found")

    engagement = await db.get(AuditEngagement, cycle.engagement_id)
    if engagement is None:
        raise ValueError("engagement_not_found")

    project = await db.get(PlantingProject, engagement.project_id)
    if project is None:
        raise ValueError("project_not_found")

    assessments = list(
        (
            await db.execute(
                select(AuditConfidenceAssessment).where(
                    AuditConfidenceAssessment.cycle_id == cycle_id
                )
            )
        ).scalars().all()
    )
    risk_rows = list(
        (
            await db.execute(
                select(AuditRiskAssessment).where(AuditRiskAssessment.cycle_id == cycle_id)
            )
        ).scalars().all()
    )
    anomalies = list(
        (
            await db.execute(
                select(AuditAnomalyEvent).where(AuditAnomalyEvent.cycle_id == cycle_id)
            )
        ).scalars().all()
    )

    plot_ids = await active_plan_plot_ids(db, cycle_id=cycle_id)
    plots_total = len(plot_ids)
    plots_visited = 0
    plots_due = 0
    if plot_ids:
        visited_rows = (
            await db.execute(
                select(AuditFieldPlot.id).where(
                    AuditFieldPlot.id.in_(plot_ids),
                    AuditFieldPlot.status == "visited",
                )
            )
        ).scalars().all()
        plots_visited = len(visited_rows)
        plots_due = plots_total - plots_visited

    recon = await latest_reconciliation_run(db, cycle_id=cycle_id)
    reconciliation_aligned = recon.aligned_count if recon else 0
    reconciliation_mismatch = recon.mismatch_count if recon else 0
    reconciliation_no_field = recon.no_field_data_count if recon else 0

    open_anomalies = [a for a in anomalies if a.status == "open"]
    critical_anomalies = [a for a in open_anomalies if a.severity == "critical"]

    now = datetime.now(UTC)
    payload = {
        "cycle_id": str(cycle_id),
        "engagement_id": str(engagement.id),
        "project_id": str(project.id),
        "organization_id": str(engagement.organization_id) if engagement.organization_id else None,
        "grade_counts": _count_grades(assessments),
        "risk_level_counts": _count_risk_levels(risk_rows),
        "plots_total": plots_total,
        "plots_visited": plots_visited,
        "plots_due": plots_due,
        "reconciliation_aligned": reconciliation_aligned,
        "reconciliation_mismatch": reconciliation_mismatch,
        "reconciliation_no_field": reconciliation_no_field,
    }

    existing = (
        await db.execute(
            select(AuditPortfolioCycleRollup).where(AuditPortfolioCycleRollup.cycle_id == cycle_id)
        )
    ).scalar_one_or_none()

    fields = {
        "engagement_id": engagement.id,
        "project_id": project.id,
        "organization_id": engagement.organization_id,
        "engagement_status": engagement.status,
        "cycle_status": cycle.status,
        "cycle_number": cycle.cycle_number,
        "grade_counts": payload["grade_counts"],
        "risk_level_counts": payload["risk_level_counts"],
        "open_anomaly_count": len(open_anomalies),
        "critical_anomaly_count": len(critical_anomalies),
        "plots_total": plots_total,
        "plots_visited": plots_visited,
        "plots_due": plots_due,
        "reconciliation_aligned": reconciliation_aligned,
        "reconciliation_mismatch": reconciliation_mismatch,
        "reconciliation_no_field": reconciliation_no_field,
        "computed_at": now,
    }

    if existing:
        for key, value in fields.items():
            setattr(existing, key, value)
        await db.flush()
        return existing

    row = AuditPortfolioCycleRollup(cycle_id=cycle_id, **fields)
    db.add(row)
    await db.flush()
    return row


async def compute_org_portfolio_rollups(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
) -> list[AuditPortfolioCycleRollup]:
    engagements = list(
        (
            await db.execute(
                select(AuditEngagement).where(AuditEngagement.organization_id == organization_id)
            )
        ).scalars().all()
    )

    rollups: list[AuditPortfolioCycleRollup] = []
    for engagement in engagements:
        cycle_id = await resolve_read_cycle_id(db, engagement.id)
        if cycle_id is None:
            continue
        rollups.append(await compute_cycle_rollup(db, cycle_id=cycle_id))
    return rollups


async def list_org_rollups(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
) -> list[AuditPortfolioCycleRollup]:
    return list(
        (
            await db.execute(
                select(AuditPortfolioCycleRollup)
                .where(AuditPortfolioCycleRollup.organization_id == organization_id)
                .order_by(AuditPortfolioCycleRollup.computed_at.desc())
            )
        ).scalars().all()
    )


def rollup_to_dict(row: AuditPortfolioCycleRollup) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "cycle_id": str(row.cycle_id),
        "engagement_id": str(row.engagement_id),
        "project_id": str(row.project_id),
        "organization_id": str(row.organization_id) if row.organization_id else None,
        "engagement_status": row.engagement_status,
        "cycle_status": row.cycle_status,
        "cycle_number": row.cycle_number,
        "grade_counts": row.grade_counts,
        "risk_level_counts": row.risk_level_counts,
        "open_anomaly_count": row.open_anomaly_count,
        "critical_anomaly_count": row.critical_anomaly_count,
        "plots_total": row.plots_total,
        "plots_visited": row.plots_visited,
        "plots_due": row.plots_due,
        "reconciliation_aligned": row.reconciliation_aligned,
        "reconciliation_mismatch": row.reconciliation_mismatch,
        "reconciliation_no_field": row.reconciliation_no_field,
        "computed_at": row.computed_at.isoformat() if row.computed_at else None,
    }


async def org_rollup_aggregate(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
) -> dict[str, Any]:
    rows = await list_org_rollups(db, organization_id=organization_id)
    if not rows:
        return {
            "organization_id": str(organization_id),
            "engagement_count": 0,
            "plots_due": 0,
            "open_anomaly_count": 0,
            "critical_anomaly_count": 0,
            "reconciliation_mismatch": 0,
        }
    return {
        "organization_id": str(organization_id),
        "engagement_count": len(rows),
        "plots_due": sum(r.plots_due for r in rows),
        "open_anomaly_count": sum(r.open_anomaly_count for r in rows),
        "critical_anomaly_count": sum(r.critical_anomaly_count for r in rows),
        "reconciliation_mismatch": sum(r.reconciliation_mismatch for r in rows),
        "rollups": [rollup_to_dict(r) for r in rows],
    }
