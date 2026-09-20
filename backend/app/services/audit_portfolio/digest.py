"""P15–P16 — report templates and scheduled digest exports."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_portfolio_ops import (
    AuditDigestRun,
    AuditDigestSchedule,
    AuditReportTemplate,
)
from app.services.audit_portfolio.anomaly_patterns import (
    list_cross_estate_patterns,
    pattern_to_dict,
)
from app.services.audit_portfolio.field_plot_queue import build_audit_field_plot_queue
from app.services.audit_portfolio.portfolio_summary import build_audit_portfolio_summary
from app.services.audit_portfolio.rollups import org_rollup_aggregate

_CADENCE_DAYS = {"daily": 1, "weekly": 7, "monthly": 30}


async def list_report_templates(db: AsyncSession) -> list[AuditReportTemplate]:
    return list(
        (
            await db.execute(
                select(AuditReportTemplate)
                .where(AuditReportTemplate.status == "active")
                .order_by(AuditReportTemplate.code.asc())
            )
        ).scalars().all()
    )


async def upsert_digest_schedule(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    template_code: str,
    cadence: str = "weekly",
    enabled: bool = True,
) -> AuditDigestSchedule:
    template = await db.get(AuditReportTemplate, template_code)
    if template is None:
        raise ValueError("template_not_found")

    existing = (
        await db.execute(
            select(AuditDigestSchedule).where(
                AuditDigestSchedule.organization_id == organization_id,
                AuditDigestSchedule.template_code == template_code,
            )
        )
    ).scalar_one_or_none()

    now = datetime.now(UTC)
    next_run = now + timedelta(days=_CADENCE_DAYS.get(cadence, 7))

    if existing:
        existing.cadence = cadence
        existing.enabled = enabled
        if existing.next_run_at is None:
            existing.next_run_at = next_run
        await db.flush()
        return existing

    row = AuditDigestSchedule(
        organization_id=organization_id,
        template_code=template_code,
        cadence=cadence,
        enabled=enabled,
        next_run_at=next_run,
    )
    db.add(row)
    await db.flush()
    return row


async def list_digest_schedules(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
) -> list[AuditDigestSchedule]:
    return list(
        (
            await db.execute(
                select(AuditDigestSchedule)
                .where(AuditDigestSchedule.organization_id == organization_id)
                .order_by(AuditDigestSchedule.created_at.desc())
            )
        ).scalars().all()
    )


async def _section_payload(
    db: AsyncSession,
    user,
    *,
    organization_id: uuid.UUID,
    section: str,
) -> dict[str, Any]:
    if section == "portfolio_summary":
        return await build_audit_portfolio_summary(db, user)
    if section == "field_queue":
        return await build_audit_field_plot_queue(db, user, limit=100)
    if section == "reconciliation_gaps":
        aggregate = await org_rollup_aggregate(db, organization_id=organization_id)
        return {
            "reconciliation_mismatch": aggregate.get("reconciliation_mismatch", 0),
            "rollups": aggregate.get("rollups", []),
        }
    if section == "anomaly_patterns":
        patterns = await list_cross_estate_patterns(db, organization_id=organization_id)
        return {"patterns": [pattern_to_dict(p) for p in patterns]}
    if section == "critical_anomalies":
        aggregate = await org_rollup_aggregate(db, organization_id=organization_id)
        return {"critical_anomaly_count": aggregate.get("critical_anomaly_count", 0)}
    if section == "mismatch_blocks":
        aggregate = await org_rollup_aggregate(db, organization_id=organization_id)
        return {"reconciliation_mismatch": aggregate.get("reconciliation_mismatch", 0)}
    return {"section": section, "status": "unsupported"}


async def generate_digest_run(
    db: AsyncSession,
    user,
    *,
    organization_id: uuid.UUID,
    template_code: str,
    schedule_id: uuid.UUID | None = None,
) -> AuditDigestRun:
    template = await db.get(AuditReportTemplate, template_code)
    if template is None:
        raise ValueError("template_not_found")

    sections_payload: dict[str, Any] = {}
    for section in template.sections or []:
        sections_payload[section] = await _section_payload(
            db,
            user,
            organization_id=organization_id,
            section=str(section),
        )

    now = datetime.now(UTC)
    payload = {
        "template_code": template_code,
        "template_name": template.name,
        "template_version": template.version,
        "organization_id": str(organization_id),
        "generated_at": now.isoformat(),
        "sections": sections_payload,
    }

    run = AuditDigestRun(
        schedule_id=schedule_id,
        organization_id=organization_id,
        template_code=template_code,
        status="generated",
        payload=payload,
        generated_at=now,
    )
    db.add(run)

    if schedule_id is not None:
        schedule = await db.get(AuditDigestSchedule, schedule_id)
        if schedule is not None:
            schedule.last_run_at = now
            schedule.next_run_at = now + timedelta(days=_CADENCE_DAYS.get(schedule.cadence, 7))

    await db.flush()
    return run


async def list_digest_runs(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    limit: int = 20,
) -> list[AuditDigestRun]:
    return list(
        (
            await db.execute(
                select(AuditDigestRun)
                .where(AuditDigestRun.organization_id == organization_id)
                .order_by(AuditDigestRun.generated_at.desc())
                .limit(limit)
            )
        ).scalars().all()
    )


def template_to_dict(row: AuditReportTemplate) -> dict[str, Any]:
    return {
        "code": row.code,
        "name": row.name,
        "version": row.version,
        "sections": row.sections,
        "status": row.status,
    }


def schedule_to_dict(row: AuditDigestSchedule) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "organization_id": str(row.organization_id),
        "template_code": row.template_code,
        "cadence": row.cadence,
        "enabled": row.enabled,
        "next_run_at": row.next_run_at.isoformat() if row.next_run_at else None,
        "last_run_at": row.last_run_at.isoformat() if row.last_run_at else None,
    }


def digest_run_to_dict(row: AuditDigestRun) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "schedule_id": str(row.schedule_id) if row.schedule_id else None,
        "organization_id": str(row.organization_id),
        "template_code": row.template_code,
        "status": row.status,
        "payload": row.payload,
        "generated_at": row.generated_at.isoformat() if row.generated_at else None,
    }
