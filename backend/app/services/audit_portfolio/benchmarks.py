"""P7–P9 — benchmark baselines from portfolio rollups."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from statistics import mean
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_portfolio_ops import AuditBenchmarkBaseline, AuditPortfolioCycleRollup

_METRIC_CODES = (
    "plots_due_per_engagement",
    "open_anomaly_rate",
    "mismatch_rate",
    "critical_anomaly_rate",
)


def _metric_value(metric_code: str, rows: list[AuditPortfolioCycleRollup]) -> tuple[float, int]:
    if not rows:
        return 0.0, 0

    if metric_code == "plots_due_per_engagement":
        values = [r.plots_due for r in rows]
        return float(mean(values)), len(values)

    if metric_code == "open_anomaly_rate":
        values = [r.open_anomaly_count for r in rows]
        return float(mean(values)), len(values)

    if metric_code == "critical_anomaly_rate":
        values = [r.critical_anomaly_count for r in rows]
        return float(mean(values)), len(values)

    if metric_code == "mismatch_rate":
        values = []
        for row in rows:
            total = row.reconciliation_aligned + row.reconciliation_mismatch + row.reconciliation_no_field
            if total > 0:
                values.append(row.reconciliation_mismatch / total)
        if not values:
            return 0.0, 0
        return float(mean(values)), len(values)

    return 0.0, 0


async def compute_benchmark_baselines(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID | None,
    scope: str = "org",
) -> list[AuditBenchmarkBaseline]:
    """Derive benchmark metrics from persisted portfolio rollups."""
    stmt = select(AuditPortfolioCycleRollup).order_by(
        AuditPortfolioCycleRollup.computed_at.desc()
    )
    if scope == "org" and organization_id is not None:
        stmt = stmt.where(AuditPortfolioCycleRollup.organization_id == organization_id)
    elif scope == "platform":
        stmt = stmt.limit(200)
    else:
        stmt = stmt.limit(200)

    rollups = list((await db.execute(stmt)).scalars().all())
    now = datetime.now(UTC)
    created: list[AuditBenchmarkBaseline] = []

    for metric_code in _METRIC_CODES:
        value, sample_count = _metric_value(metric_code, rollups)
        signals: dict[str, Any] = {
            "rollup_count": len(rollups),
            "sample_count": sample_count,
        }

        existing = (
            await db.execute(
                select(AuditBenchmarkBaseline).where(
                    AuditBenchmarkBaseline.scope == scope,
                    AuditBenchmarkBaseline.organization_id == organization_id,
                    AuditBenchmarkBaseline.metric_code == metric_code,
                )
            )
        ).scalar_one_or_none()

        if existing:
            existing.metric_value = value
            existing.sample_count = sample_count
            existing.signals = signals
            existing.computed_at = now
            created.append(existing)
        else:
            row = AuditBenchmarkBaseline(
                scope=scope,
                organization_id=organization_id,
                metric_code=metric_code,
                metric_value=value,
                sample_count=sample_count,
                signals=signals,
                computed_at=now,
            )
            db.add(row)
            created.append(row)

    await db.flush()
    return created


async def list_benchmark_baselines(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID | None,
    scope: str = "org",
) -> list[AuditBenchmarkBaseline]:
    return list(
        (
            await db.execute(
                select(AuditBenchmarkBaseline)
                .where(
                    AuditBenchmarkBaseline.scope == scope,
                    AuditBenchmarkBaseline.organization_id == organization_id,
                )
                .order_by(AuditBenchmarkBaseline.metric_code.asc())
            )
        ).scalars().all()
    )


def benchmark_to_dict(row: AuditBenchmarkBaseline) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "scope": row.scope,
        "organization_id": str(row.organization_id) if row.organization_id else None,
        "metric_code": row.metric_code,
        "metric_value": float(row.metric_value),
        "sample_count": row.sample_count,
        "signals": row.signals,
        "computed_at": row.computed_at.isoformat() if row.computed_at else None,
    }
